/**
 * Order rows for the admin panel, and the admin-only live feed that carries them.
 *
 * One definition of what an order row looks like, used twice: GET /api/admin/orders
 * lists every row through it, and every write that changes an order pushes that one
 * row through it over the admin channel. The panel replaces exactly that <tr>, so the
 * live update and the list can never disagree about a row's shape.
 *
 * Its own module, depending on util alone, so routes.ts (payment submitted),
 * distribution.ts (the counter) and admin.ts (review, collect, delete) can all import
 * it — admin.ts already imports routes.ts, and routes.ts importing admin.ts back would
 * be a cycle.
 *
 * The admin channel matters for more than speed. An order id is the collection
 * capability — whoever holds it can draw the QR — so order traffic must never reach
 * the public /api/live socket every storefront visitor holds open. It goes to
 * /api/admin/live only, whose sockets the hub admits after checking an admin token.
 */
import type { PricedLine } from './cart.ts';
import type { CollectionStatus } from './routes.ts';
import type { Env } from './util.ts';

/**
 * Every order as the panel shows it, newest first — or just the one, when `orderId` is
 * given. A missing id gives an empty array, not a throw: the caller decides whether
 * that means "deleted" or "not found".
 */
export async function orderRows(env: Env, orderId?: string) {
	const stmt = env.DB.prepare(
		`SELECT o.order_id, o.order_info, o.total_price_paise, o.payment_status,
		        o.collection_status, o.roll_number, o.collected_at, o.created_at,
		        o.customer_info, o.review_status, o.payment_ref, o.payment_proof_path,
		        o.payment_submitted_at, o.reviewed_by_name, o.reviewed_at, o.review_note,
		        o.spot_pass, o.stock_taken,
		        p.razorpay_transaction_id, p.transaction_info
		   FROM orders o
		   LEFT JOIN payments p ON p.order_id = o.order_id
		  ${orderId === undefined ? '' : 'WHERE o.order_id = ?'}
		  ORDER BY o.created_at DESC, o.order_id DESC`,
	);
	const { results } = await (orderId === undefined ? stmt : stmt.bind(orderId)).all<{
		order_id: string;
		order_info: string;
		spot_pass: string | null;
		stock_taken: number;
		total_price_paise: number;
		payment_status: string;
		collection_status: CollectionStatus;
		roll_number: string | null;
		collected_at: string | null;
		created_at: string;
		customer_info: string | null;
		review_status: string | null;
		payment_ref: string | null;
		payment_proof_path: string | null;
		payment_submitted_at: string | null;
		reviewed_by_name: string | null;
		reviewed_at: string | null;
		review_note: string | null;
		razorpay_transaction_id: string | null;
		transaction_info: string | null;
	}>();

	return results.map((o) => {
		// Counter payments store name/contact/email; a Razorpay entity carries
		// email and contact but no name. Both are read the same way, and a
		// malformed blob costs one row's details rather than the whole page.
		let name = '';
		let email = '';
		let phone = '';
		try {
			const t = o.transaction_info ? (JSON.parse(o.transaction_info) as Record<string, unknown>) : null;
			if (t) {
				name = String(t.name ?? '');
				email = String(t.email ?? '');
				phone = String(t.contact ?? '');
			}
		} catch {
			console.warn('orders: unreadable transaction_info on', o.order_id);
		}

		// The payments row is only written when an admin confirms, so an order
		// waiting in the review queue has none — and the panel would show the
		// person whose screenshot you are about to judge as a row of blanks.
		// customer_info is written before payment and fills exactly that gap.
		if (!name || !email || !phone) {
			try {
				const c = o.customer_info ? (JSON.parse(o.customer_info) as Record<string, unknown>) : null;
				if (c) {
					name = name || String(c.name ?? '');
					email = email || String(c.email ?? '');
					phone = phone || String(c.phone ?? '');
				}
			} catch {
				console.warn('orders: unreadable customer_info on', o.order_id);
			}
		}

		return {
			order_id: o.order_id,
			name,
			email,
			phone,
			roll_number: o.roll_number,
			items: JSON.parse(o.order_info) as PricedLine[],
			// Before confirmation the only reference we have is the one the student
			// typed in; after it, the payments row carries the same value.
			transaction_id: o.razorpay_transaction_id ?? o.payment_ref,
			total_price_paise: o.total_price_paise,
			payment_status: o.payment_status,
			review_status: o.review_status ?? 'none',
			payment_ref: o.payment_ref,
			// The key itself never leaves the worker — the panel asks for the bytes
			// by order id, so a leaked list of rows is not a list of object paths.
			has_proof: Boolean(o.payment_proof_path),
			payment_submitted_at: o.payment_submitted_at,
			reviewed_by_name: o.reviewed_by_name,
			reviewed_at: o.reviewed_at,
			review_note: o.review_note,
			// Sold at the stall, and whether it got what it ordered off the shelf.
			// stock_taken = 0 on a pending order means it was filed against stock
			// that had run out — the panel says so, because only a person can fix it.
			at_stall: Boolean(o.spot_pass),
			stock_taken: o.stock_taken === 1,
			collection_status: o.collection_status,
			collected_at: o.collected_at,
			created_at: o.created_at,
		};
	});
}

export type OrderRow = Awaited<ReturnType<typeof orderRows>>[number];

/**
 * Tells every signed-in admin tab exactly which order changed and what it is now.
 *
 *   { type: 'order', op: 'upsert', order: <row> }   — replace or insert that row
 *   { type: 'order', op: 'delete', order_id }       — drop it
 *
 * Reads the row fresh after the write rather than trusting the caller to assemble it,
 * so the payload is byte-for-byte what a full reload would have shown. That read is one
 * indexed lookup, and callers run this under ctx.waitUntil — it is never on the path of
 * the response the volunteer or admin is waiting for.
 *
 * Best-effort like every broadcast: the write it follows has already committed, so an
 * unreachable hub costs a log line and nothing else. A tab that misses a message
 * resyncs with a full reload when its socket reconnects.
 */
export async function broadcastOrder(env: Env, orderId: string, op: 'upsert' | 'delete'): Promise<void> {
	try {
		let msg: Record<string, unknown> = { type: 'order', op: 'delete', order_id: orderId };
		if (op === 'upsert') {
			const [order] = await orderRows(env, orderId);
			// Gone between the write and this read — say so, rather than send nothing.
			if (order) msg = { type: 'order', op: 'upsert', order };
		}
		const hub = env.HUB.get(env.HUB.idFromName('catalogue'));
		await hub.broadcast(JSON.stringify(msg), 'admin');
	} catch (e) {
		console.error('hub: order broadcast failed', e);
	}
}
