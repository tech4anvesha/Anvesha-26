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
 */
export async function adminFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
	const session = getSession();
	if (!session) toLogin();

	// FormData must set its OWN Content-Type: the browser appends the multipart
	// boundary, and a hardcoded application/json here leaves the server unable to
	// parse the body at all.
	const isForm = init.body instanceof FormData;

	const res = await fetch(API + path, {
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
 * Subscribes to live catalogue changes. Calls `onChange` whenever anyone edits or adds
 * an item, anywhere.
 *
 * Reconnects with backoff, because a dropped socket is normal — laptops sleep, wifi
 * changes, Cloudflare recycles. It also refetches on tab focus: if the socket died
 * while the tab was hidden, the first thing the viewer does is look at stale data, and
 * this closes that window without waiting for the reconnect.
 *
 * Returns a teardown function.
 */
export function onCatalogueChange(
	onChange: (reason: string) => void,
	types: readonly string[] = ['catalogue'],
): () => void {
	let socket: WebSocket | null = null;
	let retry = 0;
	let timer: number | undefined;
	let stopped = false;

	const url = API.replace(/^http/, 'ws') + '/api/live';

	function connect() {
		if (stopped) return;
		try {
			socket = new WebSocket(url);
		} catch {
			return schedule();
		}

		socket.addEventListener('open', () => { retry = 0; });
		socket.addEventListener('message', (e) => {
			try {
				const msg = JSON.parse(String(e.data));
				// A storefront has no reason to re-fetch because an order was deleted.
				if (types.includes(String(msg?.type))) onChange(String(msg.reason ?? 'changed'));
			} catch {
				// A frame we cannot parse is not worth tearing the connection down for.
			}
		});
		// 'close' covers the error case too — an errored socket always closes after.
		socket.addEventListener('close', schedule);
	}

	function schedule() {
		if (stopped) return;
		// 1s, 2s, 4s … capped at 30s so a long outage does not hammer the edge.
		const wait = Math.min(1000 * 2 ** retry++, 30_000);
		clearTimeout(timer);
		timer = setTimeout(connect, wait) as unknown as number;
	}

	const onFocus = () => {
		if (document.visibilityState !== 'visible') return;
		onChange('focus');
		// Nudge a dead socket rather than waiting out the backoff.
		if (socket?.readyState === WebSocket.CLOSED) { retry = 0; connect(); }
	};
	document.addEventListener('visibilitychange', onFocus);

	connect();

	return () => {
		stopped = true;
		clearTimeout(timer);
		document.removeEventListener('visibilitychange', onFocus);
		socket?.close();
	};
}

/** Paise -> a rupee string for an input box. */
export const toRupees = (paise: number) => (paise / 100).toFixed(2);

/**
 * Rupees -> integer paise. Rounds because 3.35 * 100 is 334.99999999999994 in binary
 * floating point, and a truncation there would quietly undercharge by a paisa.
 */
export const toPaise = (rupees: string) => Math.round(Number.parseFloat(rupees) * 100);
