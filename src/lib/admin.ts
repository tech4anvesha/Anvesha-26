/**
 * Admin client helpers — session storage and the authenticated fetch.
 *
 * The gate here is convenience, not security: every admin route re-checks the token
 * and the kill switch server-side, so clearing localStorage by hand buys an attacker
 * nothing but a redirect.
 */

import { API } from './api';

export { API, SITE } from './api';

const KEY = 'anvesha_admin_session';

export interface AdminSession {
	token: string;
	name: string;
	roll_number: string;
	collegemail: string;
}

export function getSession(): AdminSession | null {
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? (JSON.parse(raw) as AdminSession) : null;
	} catch {
		return null; // corrupt entry is the same as no session
	}
}

export const saveSession = (s: AdminSession) => localStorage.setItem(KEY, JSON.stringify(s));
export const clearSession = () => localStorage.removeItem(KEY);

/** Sends the user back to the login page, wiping whatever is left of the session. */
export function toLogin(): never {
	clearSession();
	location.href = '/admin';
	// location.href does not stop execution; throwing does, so callers cannot carry on
	// with a null session on the line after this.
	throw new Error('redirecting to login');
}

/**
 * fetch with the Bearer token attached.
 *
 * A 401 or 403 always means the session is over — expired, signed out elsewhere, or
 * the kill switch was thrown while the tab sat open. All three end the same way, which
 * is what makes `active = 0` take effect immediately rather than at next login.
 *
 * `base` defaults to the merch Worker. The events Worker is a separate deployment but
 * reads the SAME admin_login table, so one session token authenticates both and the
 * only thing that differs is the host — hence an override rather than a second client.
 */
export async function adminFetch<T = unknown>(
	path: string,
	init: RequestInit = {},
	base: string = API,
): Promise<T> {
	const session = getSession();
	if (!session) toLogin();

	// FormData must set its OWN Content-Type: the browser appends the multipart
	// boundary, and a hardcoded application/json here leaves the server unable to
	// parse the body at all.
	const isForm = init.body instanceof FormData;

	const res = await fetch(base + path, {
		...init,
		headers: {
			...(isForm ? {} : { 'Content-Type': 'application/json' }),
			Authorization: `Bearer ${session.token}`,
			...(init.headers ?? {}),
		},
	});

	if (res.status === 401 || res.status === 403) toLogin();

	const data = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
	if (!res.ok) throw new Error(data.message || data.error || `Request failed (${res.status})`);
	return data as T;
}

/**
 * Same auth, but the response is bytes rather than JSON.
 *
 * For images that sit behind requireAdmin — a payment screenshot is private, so it
 * cannot be a plain `<img src>`: an img tag sends no Authorization header. The caller
 * turns the Blob into an object URL and must revoke it when the element goes away.
 */
export async function adminBlob(path: string, base: string = API): Promise<Blob> {
	const session = getSession();
	if (!session) toLogin();

	const res = await fetch(base + path, {
		headers: { Authorization: `Bearer ${session.token}` },
	});

	if (res.status === 401 || res.status === 403) toLogin();
	if (!res.ok) {
		// The error body is JSON even though the success body is not.
		const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
		throw new Error(data.message || data.error || `Request failed (${res.status})`);
	}
	return await res.blob();
}

/**
 * One self-healing WebSocket: reconnects with backoff, because a dropped socket is
 * normal — laptops sleep, wifi changes, Cloudflare recycles — and nudges a dead one
 * the moment the tab is looked at again. Shared by the public catalogue feed and the
 * admin order feed so there is one reconnect loop, not two drifting copies.
 *
 * `onOpen` runs on every (re)connect, `onMessage` on every parsed frame, and `onWake`
 * when the tab becomes visible. Returns a teardown function.
 */
function liveSocket(
	url: string,
	handlers: { onOpen?: (ws: WebSocket) => void; onMessage: (msg: any) => void; onWake?: () => void },
): () => void {
	let socket: WebSocket | null = null;
	let retry = 0;
	let timer: number | undefined;
	let stopped = false;

	function connect() {
		if (stopped) return;
		try {
			socket = new WebSocket(url);
		} catch {
			return schedule();
		}
		const ws = socket;
		ws.addEventListener('open', () => { retry = 0; handlers.onOpen?.(ws); });
		ws.addEventListener('message', (e) => {
			try {
				handlers.onMessage(JSON.parse(String(e.data)));
			} catch {
				// A frame we cannot parse is not worth tearing the connection down for.
			}
		});
		// 'close' covers the error case too — an errored socket always closes after.
		ws.addEventListener('close', (e) => {
			// 4401: the hub refused the token. Reconnecting would only be refused again;
			// the next authenticated request sends this tab to the login page.
			if (e.code === 4401) return;
			schedule();
		});
	}

	function schedule() {
		if (stopped) return;
		// 1s, 2s, 4s … capped at 30s so a long outage does not hammer the edge.
		const wait = Math.min(1000 * 2 ** retry++, 30_000);
		clearTimeout(timer);
		timer = setTimeout(connect, wait) as unknown as number;
	}

	const onVisible = () => {
		if (document.visibilityState !== 'visible') return;
		handlers.onWake?.();
		// Nudge a dead socket rather than waiting out the backoff.
		if (socket?.readyState === WebSocket.CLOSED) { retry = 0; connect(); }
	};
	document.addEventListener('visibilitychange', onVisible);

	connect();

	return () => {
		stopped = true;
		clearTimeout(timer);
		document.removeEventListener('visibilitychange', onVisible);
		socket?.close();
	};
}

/**
 * Subscribes to live catalogue changes. Calls `onChange` whenever anyone edits or adds
 * an item, anywhere — and on tab focus, because if the socket died while the tab was
 * hidden the first thing the viewer does is look at stale data.
 *
 * `base` so the events Worker — a separate deployment with its own hub — can use the
 * same client. Returns a teardown function.
 */
export function onCatalogueChange(
	onChange: (reason: string) => void,
	types: readonly string[] = ['catalogue'],
	base: string = API,
): () => void {
	return liveSocket(base.replace(/^http/, 'ws') + '/api/live', {
		// A storefront has no reason to re-fetch because something it does not show moved.
		onMessage: (msg) => { if (types.includes(String(msg?.type))) onChange(String(msg.reason ?? 'changed')); },
		onWake: () => onChange('focus'),
	});
}

/** One message on the admin order feed — see worker/src/orderfeed.ts. */
export type OrderEvent =
	| { type: 'order'; op: 'upsert'; order: any }
	| { type: 'order'; op: 'delete'; order_id: string };

/**
 * The merch panel's order feed: each changed order row, whole, the moment it changes.
 * The panel swaps that one row instead of reloading the table.
 *
 * Signs in with the first message (a browser cannot put an Authorization header on a
 * WebSocket); the hub answers `ready`, and only then starts sending. `onResync` fires
 * on every `ready` and on tab focus — anything that changed while this socket was not
 * listening is caught by one full reload there, so a missed message can never leave
 * the table quietly wrong.
 */
export function onOrderEvents(onEvent: (e: OrderEvent) => void, onResync: () => void): () => void {
	return liveSocket(API.replace(/^http/, 'ws') + '/api/admin/live', {
		onOpen: (ws) => {
			const session = getSession();
			if (session) ws.send(JSON.stringify({ type: 'auth', token: session.token }));
		},
		onMessage: (msg) => {
			if (msg?.type === 'ready') onResync();
			else if (msg?.type === 'order') onEvent(msg as OrderEvent);
		},
		onWake: onResync,
	});
}

/** Paise -> a rupee string for an input box. */
export const toRupees = (paise: number) => (paise / 100).toFixed(2);

/**
 * Rupees -> integer paise. Rounds because 3.35 * 100 is 334.99999999999994 in binary
 * floating point, and a truncation there would quietly undercharge by a paisa.
 */
export const toPaise = (rupees: string) => Math.round(Number.parseFloat(rupees) * 100);
