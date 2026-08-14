/** Endpoint handlers. Each one throws ApiError; index.ts turns that into a response. */

import { type MerchRow, type PricedCart, type PricedLine, parseCart, priceCart } from './cart.ts';
import { parseCustomer } from './customer.ts';
import { sendOrderEmail } from './email.ts';
import {
	createRazorpayOrder,
	paymentFromEvent,
	verifyWebhookSignature,
	type WebhookEvent,
} from './razorpay.ts';
import {
	ApiError,
	bad,
	type Env,
	json,
	looksLikeOrderId,
	newOrderId,
	newPaymentId,
	newTransactionId,
	notFound,
	readJson,
	requireBudget,
	requireDistributor,
} from './util.ts';

type Cors = Record<string, string>;

// ============================================================
// 1. GET /api/merch — the catalogue
// ============================================================
export async function listMerch(env: Env, cors: Cors): Promise<Response> {
	const { results } = await env.DB.prepare(
		`SELECT id, name, description, designer, category, price_paise, has_size, r2_path
		   FROM merch WHERE is_active = 1 ORDER BY category, id`,
	).all<
		MerchRow & { description: string; designer: string; category: string; r2_path: string }
	>();

	// One query for every extra view rather than one per item: a catalogue of N items
	// would otherwise cost N+1 round trips to render a carousel most items don't use.
	const { results: extras } = await env.DB.prepare(
		`SELECT mi.merch_id, mi.label
		   FROM merch_images mi JOIN merch m ON m.id = mi.merch_id
		  WHERE m.is_active = 1
		  ORDER BY mi.merch_id, mi.sort, mi.id`,
	).all<{ merch_id: string; label: string }>();

	const viewsFor = new Map<string, string[]>();
	for (const e of extras) (viewsFor.get(e.merch_id) ?? viewsFor.set(e.merch_id, []).get(e.merch_id)!).push(e.label);

	return json(
		{
			merch: results.map((m) => {
				const labels = viewsFor.get(m.id) ?? [];
				return {
					id: m.id,
					name: m.name,
					description: m.description,
					designer: m.designer,
					category: m.category,
					price_paise: m.price_paise,
					has_size: m.has_size === 1,
					// URLs, not bytes. Inlining images as base64 in this JSON would bloat
					// the payload ~33% and make it uncacheable as a whole; the browser
					// fetches each image separately and caches it on its own.
					image_url: `/api/merch/${m.id}/image`,
					// Index 0 is the primary image, then each extra view in sort order.
					// An item with no image at all still gets one entry, so the carousel
					// always has something to point at and falls back to the category icon.
					views: [
						{ label: 'Front', url: `/api/merch/${m.id}/image/0` },
						...labels.map((label, i) => ({ label, url: `/api/merch/${m.id}/image/${i + 1}` })),
					],
				};
			}),
		},
		{},
		cors,
	);
}

// ============================================================
// 2. GET /api/merch/:id/image — stream one image out of R2
// ============================================================
export async function merchImage(env: Env, id: string, cors: Cors, index = 0): Promise<Response> {
	let path: string | undefined;

	if (index === 0) {
		const row = await env.DB.prepare(`SELECT r2_path FROM merch WHERE id = ? AND is_active = 1`)
			.bind(id)
			.first<{ r2_path: string }>();
		if (!row) throw notFound('No such item');
		path = row.r2_path;
	} else {
		// OFFSET, not an array index in JS: fetching every row to pick one would read the
		// whole carousel out of D1 on each image request.
		const row = await env.DB.prepare(
			`SELECT mi.r2_path FROM merch_images mi
			   JOIN merch m ON m.id = mi.merch_id
			  WHERE mi.merch_id = ? AND m.is_active = 1
			  ORDER BY mi.sort, mi.id
			  LIMIT 1 OFFSET ?`,
		)
			.bind(id, index - 1)
			.first<{ r2_path: string }>();
		if (!row) throw notFound('No such view');
		path = row.r2_path;
	}

	// An item created without a picture has an empty r2_path; that is expected, and the
	// storefront draws its category icon instead.
	if (!path) throw notFound('No image for this item');

	const object = await env.MEDIA.get(path);
	if (!object) throw notFound('Image missing from storage');

	const headers = new Headers(cors);
	object.writeHttpMetadata(headers); // Content-Type etc. as uploaded
	headers.set('etag', object.httpEtag);
	headers.set('Cache-Control', 'public, max-age=86400');
	return new Response(object.body, { headers });
}

// ============================================================
// 3. POST /api/checkout — validate, price, create order + Razorpay order
// ============================================================
export async function checkout(env: Env, req: Request, cors: Cors): Promise<Response> {
	await requireBudget(env, req, 'checkout');
	const body = await readJson<{ cart?: unknown }>(req);
	const lines = parseCart(body);

	// One query for every id in the cart. Looping per line would mean N round trips
	// and, worse, a cart could be priced against a catalogue that changed midway.
	const ids = [...new Set(lines.map((l) => l.merch_id))];
	const placeholders = ids.map(() => '?').join(',');
	const { results: rows } = await env.DB.prepare(
		`SELECT id, name, price_paise, has_size FROM merch
		  WHERE is_active = 1 AND id IN (${placeholders})`,
	)
		.bind(...ids)
		.all<MerchRow>();

	const priced: PricedCart = priceCart(lines, rows);

	const orderId = newOrderId();

	// While DIRECT_PAY is on there is no gateway, so no Razorpay order is created and
	// razorpay_order_id stays NULL. Creating a throwaway stub id instead would put rows
	// in the table that look like real gateway orders and confuse later reconciliation.
	const direct = env.DIRECT_PAY === '1';
	const rzp = direct ? null : await createRazorpayOrder(env, orderId, priced.total_price_paise);

	await env.DB.prepare(
		`INSERT INTO orders (order_id, order_info, total_price_paise, payment_status,
		                     collection_status, razorpay_order_id)
		 VALUES (?, ?, ?, 'unpaid', 0, ?)`,
	)
		.bind(orderId, JSON.stringify(priced.lines), priced.total_price_paise, rzp?.id ?? null)
		.run();

	return json(
		{
			order_id: orderId,
			total_price_paise: priced.total_price_paise,
			items: priced.lines,
			// Tells the browser which payment path to take. `direct` means collect the
			// buyer's details and POST /api/pay; otherwise open Razorpay Checkout.
			mode: direct ? 'direct' : 'razorpay',
			razorpay: rzp
				? {
						order_id: rzp.id,
						amount: rzp.amount,
						currency: rzp.currency,
						// Publishable id, safe in the browser — what Checkout.js needs.
						// RAZORPAY_KEY_SECRET must never leave the worker.
						key_id: env.RAZORPAY_KEY_ID ?? null,
					}
				: null,
		},
		{ status: 201 },
		cors,
	);
}

// ============================================================
// 4. POST /api/webhooks/razorpay — the only writer of payment_status
// ============================================================
export async function razorpayWebhook(env: Env, req: Request): Promise<Response> {
	// Raw text, not req.json(): the HMAC is over the exact bytes Razorpay sent.
	const raw = await req.text();
	const ok = await verifyWebhookSignature(env, raw, req.headers.get('X-Razorpay-Signature'));
	if (!ok) {
		console.warn('razorpay webhook: bad signature');
		return json({ error: 'invalid_signature' }, { status: 401 });
	}

	const body = JSON.parse(raw) as WebhookEvent;
	const entity = paymentFromEvent(body);

	// Audit first, act second — so a crash below still leaves a record of what arrived.
	await env.DB.prepare(`INSERT INTO webhook_events (event_type, payload) VALUES (?, ?)`)
		.bind(body.event ?? 'unknown', raw)
		.run();

	if (!entity) return json({ ok: true, ignored: 'no payment entity' });

	const order = await env.DB.prepare(
		`SELECT order_id, payment_status FROM orders WHERE razorpay_order_id = ?`,
	)
		.bind(entity.order_id)
		.first<{ order_id: string; payment_status: string }>();

	// 200, not 404. A non-2xx makes Razorpay retry this event for days, and an
	// unknown order is not something a retry can fix.
	if (!order) {
		console.warn('razorpay webhook: no local order for', entity.order_id);
		return json({ ok: true, ignored: 'unknown order' });
	}

	const paid = body.event === 'payment.captured' || entity.status === 'captured';
	const status = paid ? 'paid' : 'failed';

	// Already settled — Razorpay redelivering an event must not rewrite it.
	if (order.payment_status === status) return json({ ok: true, idempotent: true });

	const statements = [
		env.DB.prepare(
			`UPDATE orders SET payment_status = ?, updated_at = datetime('now')
			  WHERE order_id = ? AND payment_status = 'unpaid'`,
		).bind(status, order.order_id),
	];

	if (paid) {
		// INSERT OR IGNORE + the UNIQUE index on razorpay_transaction_id: a duplicate
		// delivery is a no-op rather than a second payment row for one transaction.
		statements.push(
			env.DB.prepare(
				`INSERT OR IGNORE INTO payments (payment_id, order_id, razorpay_transaction_id, transaction_info)
				 VALUES (?, ?, ?, ?)`,
			).bind(newPaymentId(), order.order_id, entity.id, JSON.stringify(entity)),
		);
	}

	// batch() is a transaction: the order flips to paid and the payment is recorded
	// together, or neither happens.
	await env.DB.batch(statements);

	return json({ ok: true, order_id: order.order_id, payment_status: status });
}

// ============================================================
// 5. GET /api/orders/:order_id — receipt + QR payload for the student
// ============================================================
export async function getOrder(env: Env, orderId: string, cors: Cors): Promise<Response> {
	if (!looksLikeOrderId(orderId)) throw bad('bad_order_id', 'Malformed order id');

	const order = await env.DB.prepare(
		`SELECT order_id, order_info, total_price_paise, payment_status, collection_status, created_at
		   FROM orders WHERE order_id = ?`,
	)
		.bind(orderId)
		.first<{
			order_id: string;
			order_info: string;
			total_price_paise: number;
			payment_status: string;
			collection_status: number;
			created_at: string;
		}>();
	if (!order) throw notFound('No such order');

	const payment = await env.DB.prepare(
		`SELECT razorpay_transaction_id, transaction_info FROM payments WHERE order_id = ?`,
	)
		.bind(orderId)
		.first<{ razorpay_transaction_id: string | null; transaction_info: string }>();

	// The QR carries the order id and nothing else. Two reasons:
	//   1. transaction_info holds the payer's email and phone — that must not sit in
	//      an image the student screenshots and shows to a volunteer.
	//   2. The distributor reads every detail from the database anyway, so anything
	//      extra in the QR is data the scanner would have to be told to distrust.
	// The id is 128 bits of randomness, so holding the QR is the proof of purchase,
	// exactly like a paper ticket.
	const info = payment?.transaction_info ? (JSON.parse(payment.transaction_info) as Record<string, unknown>) : null;

	return json(
		{
			order_id: order.order_id,
			items: JSON.parse(order.order_info),
			total_price_paise: order.total_price_paise,
			payment_status: order.payment_status,
			collected: order.collection_status === 1,
			created_at: order.created_at,
			razorpay_transaction_id: payment?.razorpay_transaction_id ?? null,
			// Non-identifying summary only — the full entity stays server-side.
			payment_summary: info ? { method: info.method ?? null, paid_at: info.created_at ?? null } : null,
			qr_payload: order.payment_status === 'paid' ? order.order_id : null,
		},
		{},
		cors,
	);
}

// ============================================================
// 6. POST /api/distributor/scan — what the volunteer sees after scanning
// ============================================================
export async function distributorScan(env: Env, req: Request, cors: Cors): Promise<Response> {
	requireDistributor(env, req);
	const { order_id: orderId } = await readJson<{ order_id?: string }>(req);
	return scanOrder(env, orderId, cors);
}

/**
 * The scan itself, with no opinion about who is asking. Split out so the admin panel
 * can run the same check under its own session rather than shipping the shared
 * distributor token to a browser — and so there is exactly one definition of what
 * "collectable" means.
 */
export async function scanOrder(env: Env, orderId: unknown, cors: Cors): Promise<Response> {
	if (!looksLikeOrderId(orderId)) throw bad('bad_order_id', 'Malformed order id');

	const order = await env.DB.prepare(
		`SELECT order_id, order_info, total_price_paise, payment_status, collection_status,
		        collected_at, created_at
		   FROM orders WHERE order_id = ?`,
	)
		.bind(orderId)
		.first<{
			order_id: string;
			order_info: string;
			total_price_paise: number;
			payment_status: string;
			collection_status: number;
			collected_at: string | null;
			created_at: string;
		}>();
	if (!order) throw notFound('No such order');

	const payment = await env.DB.prepare(
		`SELECT razorpay_transaction_id, transaction_info, created_at FROM payments WHERE order_id = ?`,
	)
		.bind(orderId)
		.first<{ razorpay_transaction_id: string | null; transaction_info: string; created_at: string }>();

	// A single explicit verdict, so the UI never has to infer "can I hand this over?"
	// from a combination of flags and get it wrong.
	let verdict: 'ok' | 'unpaid' | 'already_collected' = 'ok';
	if (order.payment_status !== 'paid') verdict = 'unpaid';
	else if (order.collection_status === 1) verdict = 'already_collected';

	return json(
		{
			verdict,
			collectable: verdict === 'ok',
			order: {
				order_id: order.order_id,
				items: JSON.parse(order.order_info),
				total_price_paise: order.total_price_paise,
				payment_status: order.payment_status,
				collected: order.collection_status === 1,
				collected_at: order.collected_at,
				created_at: order.created_at,
			},
			payment: payment
				? {
						razorpay_transaction_id: payment.razorpay_transaction_id,
						transaction_info: JSON.parse(payment.transaction_info),
						recorded_at: payment.created_at,
					}
				: null,
		},
		{},
		cors,
	);
}

// ============================================================
// 7. POST /api/distributor/collect — mark handed over
// ============================================================
export async function distributorCollect(env: Env, req: Request, cors: Cors): Promise<Response> {
	requireDistributor(env, req);
	const { order_id: orderId } = await readJson<{ order_id?: string }>(req);
	return collectOrder(env, orderId, cors);
}

/** The hand-over itself. Shared with the admin panel — see scanOrder above. */
export async function collectOrder(env: Env, orderId: unknown, cors: Cors): Promise<Response> {
	if (!looksLikeOrderId(orderId)) throw bad('bad_order_id', 'Malformed order id');

	// The guard lives in the WHERE clause, not in an if-statement above it. Two
	// volunteers scanning the same QR at once would both pass a read-then-write
	// check and both hand out a bag; here the second UPDATE matches no rows.
	const res = await env.DB.prepare(
		`UPDATE orders
		    SET collection_status = 1, collected_at = datetime('now'), updated_at = datetime('now')
		  WHERE order_id = ? AND payment_status = 'paid' AND collection_status = 0`,
	)
		.bind(orderId)
		.run();

	if (res.meta.changes === 1) return json({ ok: true, order_id: orderId, collected: true }, {}, cors);

	// Nothing changed — say precisely why rather than a bare failure.
	const row = await env.DB.prepare(
		`SELECT payment_status, collection_status, collected_at FROM orders WHERE order_id = ?`,
	)
		.bind(orderId)
		.first<{ payment_status: string; collection_status: number; collected_at: string | null }>();

	if (!row) throw notFound('No such order');
	if (row.payment_status !== 'paid') throw new ApiError(409, 'unpaid', 'Order is not paid');
	throw new ApiError(409, 'already_collected', `Already collected at ${row.collected_at}`);
}

// ============================================================
// 8. POST /api/pay — INTERIM counter payment, stands in for Razorpay
// ============================================================
/**
 * Settles an order without a gateway: the buyer hands over their details, the worker
 * mints its own transaction id and writes the same rows the Razorpay webhook would.
 *
 * Gated on DIRECT_PAY so it cannot coexist with a live gateway — once Razorpay is
 * wired, dropping that var makes this route 404 and the only way to mark an order paid
 * is a signature-verified webhook. Leaving both live would mean anyone could mark any
 * order paid by POSTing here.
 */
export async function directPay(
	env: Env,
	req: Request,
	cors: Cors,
	ctx?: ExecutionContext,
): Promise<Response> {
	if (env.DIRECT_PAY !== '1') throw notFound();
	await requireBudget(env, req, 'pay');

	const body = await readJson<{ order_id?: string }>(req);
	if (!looksLikeOrderId(body.order_id)) throw bad('bad_order_id', 'Malformed order id');
	const customer = parseCustomer(body); // throws before anything is written

	const order = await env.DB.prepare(
		`SELECT order_id, order_info, total_price_paise, payment_status
		   FROM orders WHERE order_id = ?`,
	)
		.bind(body.order_id)
		.first<{ order_id: string; order_info: string; total_price_paise: number; payment_status: string }>();
	if (!order) throw notFound('No such order');

	// Paying twice must not create a second payment row or overwrite the first.
	if (order.payment_status === 'paid') {
		const existing = await env.DB.prepare(
			`SELECT razorpay_transaction_id FROM payments WHERE order_id = ?`,
		)
			.bind(order.order_id)
			.first<{ razorpay_transaction_id: string | null }>();
		return json(
			{ ok: true, idempotent: true, order_id: order.order_id, transaction_id: existing?.razorpay_transaction_id ?? null, payment_status: 'paid' },
			{},
			cors,
		);
	}
	if (order.payment_status === 'failed') throw new ApiError(409, 'order_failed', 'This order cannot be paid');

	const txnId = newTransactionId();
	const info = {
		id: txnId,
		method: 'counter',
		amount: order.total_price_paise,
		status: 'captured',
		name: customer.name,
		contact: customer.phone,
		email: customer.email,
		created_at: Math.floor(Date.now() / 1000),
		note: 'Collected at the counter — no payment gateway involved',
	};

	// Same transaction shape as the webhook: order flips and the payment lands together.
	await env.DB.batch([
		env.DB.prepare(
			`UPDATE orders SET payment_status = 'paid', updated_at = datetime('now')
			  WHERE order_id = ? AND payment_status = 'unpaid'`,
		).bind(order.order_id),
		env.DB.prepare(
			`INSERT OR IGNORE INTO payments (payment_id, order_id, razorpay_transaction_id, transaction_info)
			 VALUES (?, ?, ?, ?)`,
		).bind(newPaymentId(), order.order_id, txnId, JSON.stringify(info)),
	]);

	const items: PricedLine[] = JSON.parse(order.order_info);

	// Only after the batch commits: an email must never describe an order that failed
	// to save. waitUntil lets the response go back immediately while the mail is still
	// in flight, and sendOrderEmail swallows its own failures — a confirmation that
	// does not arrive is not a reason to tell the student their payment failed.
	const mail = sendOrderEmail(env, {
		to: customer.email,
		name: customer.name,
		orderId: order.order_id,
		transactionId: txnId,
		items,
		totalPaise: order.total_price_paise,
	});
	if (ctx) ctx.waitUntil(mail);

	return json(
		{
			ok: true,
			order_id: order.order_id,
			transaction_id: txnId,
			payment_status: 'paid',
			total_price_paise: order.total_price_paise,
			items,
			customer,
		},
		{ status: 201 },
		cors,
	);
}
