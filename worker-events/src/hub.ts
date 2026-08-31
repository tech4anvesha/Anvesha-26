/**
 * EventsHub — the fan-out point for live schedule updates.
 *
 * Workers are stateless and every request may land in a different isolate, so there is
 * nowhere shared to keep the list of connected browsers. A Durable Object is the one
 * place Cloudflare guarantees is single-instance, which is what makes "tell everyone
 * who is looking" possible at all. One named instance ('events') is used, so every
 * viewer worldwide lands on the same object.
 *
 * Connections use the **hibernation** API: `acceptWebSocket` hands the socket to the
 * runtime, which evicts this object from memory while nothing is happening and revives
 * it on the next message. A schedule left open on a screen in the foyer all weekend
 * therefore costs nothing to hold — with a plain `server.accept()` the object would
 * stay resident and bill duration the whole time.
 *
 * Same shape as the merch Worker's CatalogueHub. Two Workers, two objects: they are
 * separate deployments, and a shared hub would mean every merch write waking every
 * events viewer.
 */

import { DurableObject } from 'cloudflare:workers';

export class EventsHub extends DurableObject {
	/** Browser opens a socket here. Nothing is ever read from it — it is one-way. */
	override async fetch(req: Request): Promise<Response> {
		if (req.headers.get('Upgrade') !== 'websocket')
			return new Response('Expected a WebSocket upgrade', { status: 426 });

		const { 0: client, 1: server } = new WebSocketPair();
		// Hibernatable: NOT server.accept(), which would pin this object in memory.
		this.ctx.acceptWebSocket(server);
		return new Response(null, { status: 101, webSocket: client });
	}

	/**
	 * Called over RPC from the request-handling Worker after a write commits.
	 * Best-effort by design: a browser that went away without closing cleanly must not
	 * turn an admin's successful save into an error.
	 */
	broadcast(payload: string): number {
		let sent = 0;
		for (const ws of this.ctx.getWebSockets()) {
			try {
				ws.send(payload);
				sent++;
			} catch {
				// Dead socket. The runtime will clean it up; nothing to do here.
			}
		}
		return sent;
	}

	/** A closing browser is routine, not an error worth logging. */
	override async webSocketClose(ws: WebSocket, code: number, reason: string) {
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
