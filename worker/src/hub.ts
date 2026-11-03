/**
 * CatalogueHub — the fan-out point for live updates.
 *
 * Workers are stateless and every request may land in a different isolate, so there is
 * no shared memory to keep a list of connected browsers in. A Durable Object is the
 * one place Cloudflare guarantees is single-instance, which is what makes "tell
 * everyone who is looking" possible at all. One named instance ('catalogue') is used,
 * so every viewer worldwide lands on the same object.
 *
 * Two channels, kept apart by the tag each socket is accepted with:
 *
 *   public  /api/live         every storefront tab. Gets "something changed" pings —
 *                             catalogue and spot — and never anything about an order.
 *   admin   /api/admin/live   the merch panel. Admitted only once the socket's first
 *                             message carries a live admin token; then gets each
 *                             changed order row in full (see orderfeed.ts).
 *
 * The split is a security line, not only a speed one: an order id is the collection
 * capability, and the public socket is open to anyone.
 *
 * Connections use the **hibernation** API: `acceptWebSocket` hands the socket to the
 * runtime, which evicts this object from memory while nothing is happening and revives
 * it on the next message. A fest tab left open for six hours therefore costs nothing
 * to hold. Whether an admin socket has signed in is kept in its serialized attachment,
 * which survives hibernation where an instance field would not.
 */
import { DurableObject } from 'cloudflare:workers';
import { adminByToken } from './admin.ts';
import type { Env } from './util.ts';

export type Channel = 'public' | 'admin';

/** What an admin socket carries across hibernation. */
interface AdminAttachment {
	/** Epoch ms the admin's session ages out. 0 until the socket has signed in. */
	exp: number;
}

/** A WebSocket close code in the 4000 range is ours to define: 4401 = not signed in. */
const UNAUTHORIZED = 4401;

export class CatalogueHub extends DurableObject<Env> {
	/** Browser opens a socket here. The path picks the channel. */
	override async fetch(req: Request): Promise<Response> {
		if (req.headers.get('Upgrade') !== 'websocket')
			return new Response('Expected a WebSocket upgrade', { status: 426 });

		const channel: Channel = new URL(req.url).pathname === '/api/admin/live' ? 'admin' : 'public';
		const { 0: client, 1: server } = new WebSocketPair();
		// Hibernatable: NOT server.accept(), which would pin this object in memory.
		this.ctx.acceptWebSocket(server, [channel]);
		if (channel === 'admin') server.serializeAttachment({ exp: 0 } satisfies AdminAttachment);
		return new Response(null, { status: 101, webSocket: client });
	}

	/**
	 * The only thing a socket ever sends: an admin socket's sign-in, as its first
	 * message — `{"type":"auth","token":"…"}`. The token is checked exactly the way a
	 * request's Bearer header is (adminByToken), including the kill switch and roster.
	 *
	 * A bad token closes the socket rather than letting it try again, so a stolen-link
	 * guesser gets one D1 read per connection, not a loop. Public sockets, and admin
	 * sockets that are already signed in, are ignored — there is nothing else to say.
	 */
	override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
		if (!this.ctx.getTags(ws).includes('admin')) return;
		if ((ws.deserializeAttachment() as AdminAttachment | null)?.exp) return;

		let token = '';
		try {
			const msg = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message));
			if (msg?.type === 'auth' && typeof msg.token === 'string') token = msg.token;
		} catch {
			// not JSON — falls through as no token
		}

		try {
			const session = await adminByToken(this.env, token);
			const exp = Date.parse(session.expires_at.replace(' ', 'T') + 'Z');
			ws.serializeAttachment({ exp } satisfies AdminAttachment);
			// The panel waits for this before it trusts the feed: it does one full reload
			// on `ready`, so nothing that changed while it was connecting is missed.
			ws.send(JSON.stringify({ type: 'ready' }));
		} catch {
			ws.close(UNAUTHORIZED, 'unauthorized');
		}
	}

	/**
	 * Called over RPC from the request-handling Worker after a write commits.
	 * Best-effort by design: a browser that has gone away without closing cleanly
	 * must not turn an admin's successful save into an error.
	 *
	 * Admin sockets only receive once signed in, and stop at the session's expiry —
	 * a panel left open past its twelve hours is closed and has to sign in again,
	 * exactly as its next request would have found.
	 */
	broadcast(payload: string, channel: Channel = 'public'): number {
		const now = Date.now();
		let sent = 0;
		for (const ws of this.ctx.getWebSockets(channel)) {
			try {
				if (channel === 'admin') {
					const exp = (ws.deserializeAttachment() as AdminAttachment | null)?.exp ?? 0;
					if (!exp) continue; // connected, not yet signed in
					if (exp <= now) { ws.close(UNAUTHORIZED, 'session expired'); continue; }
				}
				ws.send(payload);
				sent++;
			} catch {
				// Dead socket. The runtime will clean it up; nothing to do here.
			}
		}
		return sent;
	}

	/** A closing browser is routine, not an error worth logging. */
	override async webSocketClose(ws: WebSocket, code: number, reason: string, _wasClean: boolean) {
		ws.close(code, reason);
	}

	override async webSocketError(ws: WebSocket) {
		try {
			ws.close(1011, 'error');
		} catch {
			// already gone
		}
	}
}
