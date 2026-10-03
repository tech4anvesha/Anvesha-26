/** Endpoint handlers. Each one throws ApiError; index.ts turns that into a response. */

import { MAX_LINES, type MerchRow, type PricedCart, type PricedLine, parseCart, priceCart } from './cart.ts';
import { type Customer, normaliseRoll, parseCustomer } from './customer.ts';
import { sendOrderEmail } from './email.ts';
import {
	ApiError,
	EXT,
	broadcastChange,
	IMAGE_TYPES,
	MAX_IMAGE_BYTES,
	bad,
	type Env,
	json,
	looksLikeOrderId,
	newOrderId,
	newPaymentId,
	newTransactionId,
	looksLikeImage,
	notFound,
	readJson,
	requireBudget,
} from './util.ts';

type Cors = Record<string, string>;

/**
 * Both switches off the one merch_release row.
 *
 * A missing row (a deployment that predates the migration) reads as VISIBLE and
 * NOT SELLING — the same defaults the row is seeded with, except visibility, which
 * defaults open so the switch can never take the shop down by failing to exist.
 */
async function readSwitches(env: Env): Promise<{ visible: boolean; selling: boolean }> {
	const row = await env.DB.prepare(
		`SELECT activation_status, sale_activation FROM merch_release WHERE id = 1`,
	).first<{ activation_status: number; sale_activation: number | null }>();
	if (!row) return { visible: true, selling: false };
	return { visible: row.activation_status === 1, selling: row.sale_activation === 1 };
}

// ============================================================
// 1. GET /api/merch — the catalogue
// ============================================================
export async function listMerch(
	env: Env,
	cors: Cors,
	req?: Request,
	ctx?: ExecutionContext,
): Promise<Response> {
	// The most requested route on the site: every storefront load pays two D1 round
	// trips for a catalogue that changes a few times a week. Cached at the edge, and
	// purged by purgeCatalogue() the moment an admin writes, so the short max-age is
	// only the ceiling for colos the purge did not reach.
	const cache = caches.default;
	const cacheKey = req ? new Request(new URL(req.url).toString(), { method: 'GET' }) : null;
	if (cacheKey) {
		const hit = await cache.match(cacheKey);
		// The cached copy carries whichever origin's CORS headers filled it, so they are
		// overwritten with this request's rather than trusted — same as merchImage.
		if (hit) {
			const headers = new Headers(hit.headers);
			for (const [k, v] of Object.entries(cors)) headers.set(k, v);
			return new Response(hit.body, { headers, status: hit.status });
		}
	}

	// The shop-wide switch, read before the catalogue rather than filtered after it.
	// A closed shop returns NO items at all: leaving them in the payload for the page to
	// hide would put every unreleased name and price in the network tab, which is the
	// one thing a "coming soon" page is meant to prevent.
	// Missing row (a deployment that predates the migration) reads as OPEN, so the
	// switch can never take the shop down by failing to exist.
	const release = await readSwitches(env);
	const released = release.visible;
	// The admin's switch alone. There used to be a second condition — "is a gateway
	// configured" — but payment is manual now: the student pays in their own app and
	// submits evidence, so the capability is always there and intent is all that is left
	// to ask about.
	const salesOpen = release.selling;

	if (!released) {
		// Cached and headered exactly like the open catalogue below, and purged by the
		// same key, so flipping the switch reaches shoppers as fast as a price change.
		const body = json({ released: false, sales_open: salesOpen, merch: [] }, {}, cors);
		body.headers.set('Cache-Control', 'public, max-age=60');
		if (cacheKey && ctx) ctx.waitUntil(cache.put(cacheKey, body.clone()));
		return body;
	}

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

	const body = json(
		{
			released: true,
			// Browse-only when false: the page keeps the catalogue up but disables its
			// checkout. Served here so the storefront learns it from the one request it
			// already makes, rather than probing checkout to find out.
			sales_open: salesOpen,
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

	body.headers.set('Cache-Control', 'public, max-age=60');
	if (cacheKey && ctx) ctx.waitUntil(cache.put(cacheKey, body.clone()));
	return body;
}

// ============================================================
// 2. GET /api/merch/:id/image — stream one image out of R2
// ============================================================
export async function merchImage(
	env: Env,
	id: string,
	cors: Cors,
	index = 0,
	req?: Request,
	ctx?: ExecutionContext,
): Promise<Response> {
	// Edge cache first. Without this every thumbnail on the storefront costs a D1 query
	// AND an R2 GET on every cold browser cache — the catalogue grid is the most
	// requested thing on the site, and none of that work changes between requests.
	// Keyed on the request URL, which already encodes the item and the view index.
	const cache = caches.default;
	const cacheKey = req ? new Request(new URL(req.url).toString(), { method: 'GET' }) : null;
	if (cacheKey) {
		const hit = await cache.match(cacheKey);
		// CORS is per-origin and must not be served from a shared cache, so the cached
		// copy carries none — the live headers are merged back on the way out.
		if (hit) {
			const headers = new Headers(hit.headers);
			for (const [k, v] of Object.entries(cors)) headers.set(k, v);
			return new Response(hit.body, { headers, status: hit.status });
		}
	}

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

	const response = new Response(object.body, { headers });

	// clone(), not arrayBuffer(): the body stays a stream, so the browser starts
	// receiving bytes immediately instead of waiting for the whole image to buffer.
	// The cached copy keeps whichever origin's CORS headers this request had, which is
	// why the hit path above overwrites them rather than trusting what it finds.
	if (cacheKey && ctx) ctx.waitUntil(cache.put(cacheKey, response.clone()));

	return response;
}

// ============================================================
// 3. POST /api/checkout — validate, price, create order + Razorpay order
// ============================================================
export async function checkout(env: Env, req: Request, cors: Cors): Promise<Response> {
	await requireBudget(env, req, 'checkout');

	// Two gates, checked before anything is priced or written, each with its own answer
	// so a stale tab learns WHY rather than seeing one generic refusal:
	//   1. the catalogue is hidden    -> 403 shop_closed
	//   2. visible, but sales are off -> 403 sales_closed
	// Hiding the button is a page-level change this route never sees, so without these
	// a replayed request could still place an order the store has no way to settle.
	// There is no third "is a gateway configured" gate any more: payment is manual, so
	// the capability is always there and sales_open is the admin's switch alone.
	const release = await readSwitches(env);
	if (!release.visible) throw new ApiError(403, 'shop_closed', 'The merch store is not open yet');
	if (!release.selling) throw new ApiError(403, 'sales_closed', 'Merch sales have not gone live yet');

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

	// A QUOTE, not an order. Nothing is written here on purpose: most people who click
	// CHECKOUT never pay, and a row per click filled the admin queue with carts that
	// were only ever browsed. The row is created by submitPayment, when there is a
	// transaction reference and a screenshot to put in it — that is the first moment
	// anything happened worth recording.
	//
	// The id is minted here anyway, because the student pays against it: it goes into
	// the UPI note so the bank narration matches the order. submitPayment re-prices the
	// cart from the catalogue rather than trusting what comes back, so holding this on
	// the client costs nothing.
	const orderId = newOrderId();

	return json(
		{
			order_id: orderId,
			total_price_paise: priced.total_price_paise,
			items: priced.lines,
			// One path now: collect the buyer's details, show them the UPI QR, take a
			// transaction reference and a screenshot. Kept as a field rather than dropped
			// so a cached old build gets something it does not recognise and fails loudly
			// instead of silently taking the gateway branch it no longer has.
			mode: 'manual',
		},
		{ status: 201 },
		cors,
	);
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
			collection_status: CollectionStatus;
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
			collection_status: order.collection_status,
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

/** The three states an order's hand-over can be in. Lives here because both
 *  scanOrder and collectItems need it and neither owns the other. */
export type CollectionStatus = 'pending' | 'partial' | 'collected';


/**
 * The scan itself, with no opinion about who is asking. Split out so the admin panel
 * can run the same check under its own session rather than shipping the shared
 * distributor token to a browser — and so there is exactly one definition of what a
 * volunteer sees.
 *
 * No `verdict`/`collectable` summary field any more: with per-item collection there
 * is no single "can I hand this over" bit, so the caller reads payment_status and
 * collection_status directly instead of trusting a flag computed from them.
 */
export async function scanOrder(env: Env, orderId: unknown, cors: Cors): Promise<Response> {
	if (!looksLikeOrderId(orderId)) throw bad('bad_order_id', 'Malformed order id');

	// One round trip, not two. A scan is the single most repeated action at the counter,
	// and D1 lives one region away — reading the payment in the same query halves the
	// wait between a volunteer scanning and the checklist appearing. LEFT JOIN because an
	// unpaid order has no payment row, and it cannot fan out: payments.order_id is UNIQUE.
	const order = await env.DB.prepare(
		`SELECT o.order_id, o.order_info, o.total_price_paise, o.payment_status, o.collection_status,
		        o.roll_number, o.collected_at, o.created_at,
		        p.razorpay_transaction_id, p.transaction_info, p.created_at AS payment_created_at
		   FROM orders o
		   LEFT JOIN payments p ON p.order_id = o.order_id
		  WHERE o.order_id = ?`,
	)
		.bind(orderId)
		.first<{
			order_id: string;
			order_info: string;
			total_price_paise: number;
			payment_status: string;
			collection_status: CollectionStatus;
			roll_number: string | null;
			collected_at: string | null;
			created_at: string;
			razorpay_transaction_id: string | null;
			transaction_info: string | null;
			payment_created_at: string | null;
		}>();
	if (!order) throw notFound('No such order');

	// transaction_info is NOT NULL on the payments table, so a null here means the LEFT
	// JOIN found no row at all — an unpaid order — rather than a payment missing a field.
	const payment = order.transaction_info === null ? null : order;

	return json(
		{
			order: {
				order_id: order.order_id,
				// NULL on orders placed before roll numbers were collected — the counter
				// shows a dash rather than pretending it knows.
				roll_number: order.roll_number,
				// Every line carries its own `collected` flag — see PricedLine. An order
				// placed before this feature existed never had one written; default it to 0
				// on the way out rather than rewriting every historical row for it.
				items: (JSON.parse(order.order_info) as PricedLine[]).map((l) => ({
					...l,
					collected: l.collected === 1 ? 1 : 0,
				})),
				total_price_paise: order.total_price_paise,
				payment_status: order.payment_status,
				collection_status: order.collection_status,
				collected_at: order.collected_at,
				created_at: order.created_at,
			},
			payment: payment
				? {
						razorpay_transaction_id: payment.razorpay_transaction_id,
						transaction_info: JSON.parse(payment.transaction_info!),
						recorded_at: payment.payment_created_at,
					}
				: null,
		},
		{},
		cors,
	);
}


/**
 * Strikes the given line indexes off an order and recomputes its collection_status.
 * Shared with the admin panel and the counter session routes — see scanOrder above.
 *
 * `lines` omitted means "everything still outstanding" — what the panel's own
 * "Mark All as collected" button sends, and what an external caller of the old
 * whole-order collect contract gets by not passing the field at all.
 *
 * A line, once struck off, cannot be struck back on through this endpoint — the
 * merge below only ever turns 0 into 1. There is no undo in the counter UI, so there
 * is none here either.
 */
export async function collectItems(env: Env, orderId: unknown, lines: unknown, cors: Cors): Promise<Response> {
	if (!looksLikeOrderId(orderId)) throw bad('bad_order_id', 'Malformed order id');

	const row = await env.DB.prepare(`SELECT order_info, payment_status, collection_status FROM orders WHERE order_id = ?`)
		.bind(orderId)
		.first<{ order_info: string; payment_status: string; collection_status: CollectionStatus }>();

	if (!row) throw notFound('No such order');
	if (row.payment_status !== 'paid') throw new ApiError(409, 'unpaid', 'Order is not paid');
	if (row.collection_status === 'collected')
		throw new ApiError(409, 'already_collected', 'Every item on this order is already collected');

	const items = (JSON.parse(row.order_info) as PricedLine[]).map((l) => ({
		...l,
		collected: (l.collected === 1 ? 1 : 0) as 0 | 1,
	}));

	const targets =
		lines === undefined
			? items.flatMap((l, i) => (l.collected === 0 ? [i] : []))
			: parseLineIndexes(lines, items.length);
	if (targets.length === 0) throw bad('no_items', 'Nothing was selected to collect');

	const newItems = items.map((l, i) => (targets.includes(i) ? { ...l, collected: 1 as const } : l));
	const allCollected = newItems.every((l) => l.collected === 1);
	const newStatus: CollectionStatus = allCollected ? 'collected' : 'partial';
	const newOrderInfo = JSON.stringify(newItems);

	// order_info is repeated in the WHERE clause as an optimistic-concurrency check:
	// if two scans of the same ticket ever race, whichever write lands second finds
	// the row already changed underneath it and gets a clean 409 instead of silently
	// clobbering the first volunteer's selection.
	const res = await env.DB.prepare(
		`UPDATE orders
		    SET order_info = ?, collection_status = ?,
		        collected_at = CASE WHEN ? = 'collected' THEN datetime('now') ELSE collected_at END,
		        updated_at = datetime('now')
		  WHERE order_id = ? AND payment_status = 'paid' AND collection_status != 'collected' AND order_info = ?`,
	)
		.bind(newOrderInfo, newStatus, newStatus, orderId, row.order_info)
		.run();

	if (res.meta.changes === 1)
		return json({ ok: true, order_id: orderId, collection_status: newStatus, items: newItems }, {}, cors);

	// Nothing changed — the row moved under us since it was read above. Re-read to say
	// precisely why rather than a bare failure.
	const current = await env.DB.prepare(
		`SELECT payment_status, collection_status, collected_at FROM orders WHERE order_id = ?`,
	)
		.bind(orderId)
		.first<{ payment_status: string; collection_status: CollectionStatus; collected_at: string | null }>();

	if (!current) throw notFound('No such order');
	if (current.payment_status !== 'paid') throw new ApiError(409, 'unpaid', 'Order is not paid');
	if (current.collection_status === 'collected')
		throw new ApiError(409, 'already_collected', `Already collected at ${current.collected_at}`);
	throw new ApiError(409, 'stale', 'This order changed since it was scanned — rescan it');
}

// ============================================================
// Roll-number lookup — the counter's path when there is no QR to scan
// ============================================================
/**
 * Every order belonging to one roll number, newest first.
 *
 * A list, not a single order: a student can buy more than once, and silently picking
 * "the latest" would hand over the wrong bag with no way for the volunteer to tell.
 * The caller shows the list and scans whichever order the student is actually here for.
 *
 * Matching is case-insensitive at both ends — normaliseRoll uppercases the input, and
 * COLLATE NOCASE covers anything that reached the column by another route.
 */
export async function lookupByRoll(env: Env, roll: unknown, cors: Cors): Promise<Response> {
	const rollNumber = normaliseRoll(roll);

	const { results } = await env.DB.prepare(
		`SELECT order_id, order_info, total_price_paise, payment_status, collection_status,
		        collected_at, created_at
		   FROM orders
		  WHERE roll_number = ? COLLATE NOCASE
		  ORDER BY created_at DESC, order_id DESC`,
	)
		.bind(rollNumber)
		.all<{
			order_id: string;
			order_info: string;
			total_price_paise: number;
			payment_status: string;
			collection_status: CollectionStatus;
			collected_at: string | null;
			created_at: string;
		}>();

	// 404 rather than an empty list: "no such roll" is the same dead end as "no such
	// order", and the counter page already knows how to word that.
	if (results.length === 0) throw notFound(`No order for ${rollNumber}`);

	return json(
		{
			roll_number: rollNumber,
			orders: results.map((o) => {
				const items = (JSON.parse(o.order_info) as PricedLine[]).map((l) => ({
					...l,
					collected: l.collected === 1 ? 1 : 0,
				}));
				return {
					order_id: o.order_id,
					items,
					total_price_paise: o.total_price_paise,
					payment_status: o.payment_status,
					collection_status: o.collection_status,
					collected_at: o.collected_at,
					created_at: o.created_at,
				};
			}),
		},
		{},
		cors,
	);
}

/** `lines` off the wire: must be a non-empty array of distinct in-range indexes. */
function parseLineIndexes(lines: unknown, itemCount: number): number[] {
	if (!Array.isArray(lines) || lines.length === 0 || lines.length > MAX_LINES)
		throw bad('bad_lines', 'lines must be a non-empty array of item indexes');
	const seen = new Set<number>();
	for (const v of lines) {
		if (!Number.isInteger(v) || (v as number) < 0 || (v as number) >= itemCount)
			throw bad('bad_lines', `${String(v)} is not a valid item index for this order`);
		seen.add(v as number);
	}
	return [...seen];
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
			`UPDATE orders SET payment_status = 'paid', roll_number = ?, updated_at = datetime('now')
			  WHERE order_id = ? AND payment_status = 'unpaid'`,
		).bind(customer.rollNumber, order.order_id),
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

// ============================================================
// 9. POST /api/orders/:order_id/customer — who is buying, taken before payment
// ============================================================
/**
 * Attaches the buyer to an unpaid order.
 *
 * The counter path asks for these details in the same request that settles the order.
 * A gateway cannot: Razorpay reports that money moved and has never heard of a roll
 * number, so anything not already on the order when the webhook lands is gone. The
 * browser therefore posts here BEFORE opening Checkout — and if the shopper then walks
 * away, all that is left behind is an unpaid order that knows who abandoned it.
 *
 * Rejected once the order is settled: the name on a paid order is part of the record,
 * and this endpoint takes no proof of who is calling.
 */
export async function validateCustomer(
	env: Env,
	req: Request,
	orderId: string,
	cors: Cors,
): Promise<Response> {
	await requireBudget(env, req, 'checkout');
	if (!looksLikeOrderId(orderId)) throw bad('bad_order_id', 'Malformed order id');

	// Validates and writes NOTHING. There is no row yet — submitPayment creates it — but
	// the student still has to hear about a mistyped email here, at the details step,
	// rather than after they have paid. parseCustomer owns those rules, so checking them
	// in one place on the server keeps the browser from holding a second, drifting copy.
	parseCustomer(await readJson(req));

	return json({ ok: true, order_id: orderId }, {}, cors);
}



// ============================================================
// 11. POST /api/orders/:order_id/payment — the student's evidence
// ============================================================
/**
 * Takes a UPI transaction reference and a screenshot, and parks the order in a queue
 * for an admin to check against the real statement.
 *
 * This route does NOT settle anything. `payment_status` stays 'unpaid' and no QR is
 * minted — that is the whole point of manual review, and it is why the response
 * deliberately carries no `qr_payload` for a caller to latch onto.
 *
 * multipart, not JSON: readJson caps bodies at 32 KiB and a 2 MB screenshot is ~2.7 MB
 * once base64'd, eighty times over.
 */
/**
 * One JSON field out of a multipart body.
 *
 * The 32 KiB cap mirrors readJson: this is the same untrusted-body surface, just wrapped
 * in a form part, and a cart is a few hundred bytes. Malformed JSON gets a named error
 * rather than a SyntaxError, because the browser builds these and a 500 would say the
 * server broke when it did not.
 */
function readField(form: FormData, name: string): unknown {
	const raw = form.get(name);
	if (typeof raw !== 'string') throw bad(`missing_${name}`, `Your ${name} details did not come through`);
	if (raw.length > 32 * 1024) throw bad(`bad_${name}`, `That ${name} is too large`);
	try {
		return JSON.parse(raw);
	} catch {
		throw bad(`bad_${name}`, `Could not read your ${name} details`);
	}
}

export async function submitPayment(
	env: Env,
	req: Request,
	orderId: string,
	cors: Cors,
	ctx?: ExecutionContext,
): Promise<Response> {
	// Before formData(), which buffers the whole body. adminCreateMerch can skip this
	// because it sits behind requireAdmin; this route is open to the internet.
	await requireBudget(env, req, 'submit');
	const declaredLength = Number(req.headers.get('Content-Length') ?? 0);
	if (declaredLength > MAX_IMAGE_BYTES + 64 * 1024)
		throw new ApiError(413, 'payload_too_large', 'That screenshot is too large — 5MB is the limit');

	if (!looksLikeOrderId(orderId)) throw bad('bad_order_id', 'Malformed order id');

	const order = await env.DB.prepare(
		`SELECT payment_status, review_status, payment_proof_path FROM orders WHERE order_id = ?`,
	)
		.bind(orderId)
		.first<{ payment_status: string; review_status: string | null; payment_proof_path: string | null }>();

	// No row is the NORMAL case now: checkout only quotes, so this request is what brings
	// the order into existence. A row means a resubmission after a rejection, which goes
	// down the update path below with its existing items and buyer untouched.
	if (order) {
		if (order.payment_status !== 'unpaid')
			throw new ApiError(409, 'order_settled', 'This order has already been settled');
		// 'pending' is excluded on purpose: a second submission while one is already in the
		// queue would quietly replace the evidence an admin may be looking at right now.
		if (order.review_status === 'pending')
			throw new ApiError(409, 'already_submitted', 'This order is already waiting to be confirmed');
	} else {
		// The same two gates checkout applies. This route can be reached without going
		// through checkout at all, so they have to be re-asserted here or a closed shop
		// could still have orders pushed into it.
		const release = await readSwitches(env);
		if (!release.visible) throw new ApiError(403, 'shop_closed', 'The merch store is not open yet');
		if (!release.selling) throw new ApiError(403, 'sales_closed', 'Merch sales have not gone live yet');
	}

	const form = await req.formData().catch(() => null);
	if (!form) throw bad('bad_body', 'Expected multipart form data');

	const ref = String(form.get('payment_ref') ?? '').trim();
	if (ref.length < 4 || ref.length > 64)
		throw bad('bad_payment_ref', 'Enter the transaction reference from your UPI app');

	const shot = form.get('proof');
	if (!(shot instanceof File) || shot.size === 0)
		throw bad('no_proof', 'Attach a screenshot of the successful payment');
	if (!IMAGE_TYPES.has(shot.type))
		throw bad('bad_image_type', `Unsupported image type ${shot.type || 'unknown'}`);
	if (shot.size > MAX_IMAGE_BYTES) throw bad('image_too_large', 'The screenshot must be 5MB or smaller');
	// The declared type decides the key, the stored content-type and therefore what the
	// admin's browser is told this is — so it has to be checked against the actual bytes.
	if (!(await looksLikeImage(shot, shot.type)))
		throw bad('bad_image', 'That file is not the image type it claims to be');

	// Everything needed to CREATE the order, parsed only when there is no row. The cart
	// and the buyer travel with the submission because nothing was stored at checkout.
	//
	// Priced here from the catalogue, never from what the browser says it owes: the
	// client sends ids, sizes and quantities, and priceCart looks the money up. That is
	// the same rule checkout followed, moved to the point where the row is written.
	let fresh: { priced: PricedCart; customer: Customer } | null = null;
	if (!order) {
		const lines = parseCart({ cart: readField(form, 'cart') });
		const customer = parseCustomer(readField(form, 'customer'));

		const ids = [...new Set(lines.map((l) => l.merch_id))];
		const { results: rows } = await env.DB.prepare(
			`SELECT id, name, price_paise, has_size FROM merch
			  WHERE is_active = 1 AND id IN (${ids.map(() => '?').join(',')})`,
		)
			.bind(...ids)
			.all<MerchRow>();

		fresh = { priced: priceCart(lines, rows), customer };
	}

	const key = `orders/${orderId}.${EXT[shot.type]}`;

	// Object first, row second. A row pointing at a missing object would show the admin
	// a broken thumbnail and no way to tell "not uploaded" from "lost"; an unreferenced
	// object is only wasted bytes.
	await env.MEDIA.put(key, shot.stream(), {
		httpMetadata: { contentType: shot.type, cacheControl: 'private, no-store' },
	});
	// A resubmission in a different format leaves the old object behind under its own
	// extension, and nothing would ever point at it again. Only reachable on the update
	// path — a brand new order has no earlier screenshot to supersede.
	const stale = order?.payment_proof_path;
	if (stale && stale !== key)
		await env.MEDIA.delete(stale).catch((e) =>
			console.error('proof: could not delete superseded object', stale, e),
		);

	// ON CONFLICT DO NOTHING rather than a plain INSERT: two submissions racing on one id
	// (a double-tapped SUBMIT) must not become a 500, and the loser must not overwrite
	// the evidence the winner just filed. Zero changes means someone else got there, and
	// that reads the same to the student as submitting twice.
	const res = fresh
		? await env.DB
				.prepare(
					`INSERT INTO orders (order_id, order_info, total_price_paise, payment_status,
					                     collection_status, roll_number, customer_info,
					                     review_status, payment_ref, payment_proof_path, payment_submitted_at)
					 VALUES (?, ?, ?, 'unpaid', 'pending', ?, ?, 'pending', ?, ?, datetime('now'))
					 ON CONFLICT (order_id) DO NOTHING`,
				)
				.bind(
					orderId,
					JSON.stringify(fresh.priced.lines),
					fresh.priced.total_price_paise,
					fresh.customer.rollNumber,
					JSON.stringify(fresh.customer),
					ref,
					key,
				)
				.run()
		: await env.DB
				.prepare(
					`UPDATE orders
					    SET review_status = 'pending', payment_ref = ?, payment_proof_path = ?,
					        payment_submitted_at = datetime('now'), review_note = NULL,
					        updated_at = datetime('now')
					  WHERE order_id = ? AND payment_status = 'unpaid'`,
				)
				.bind(ref, key, orderId)
				.run();
	if (!res.meta.changes)
		throw new ApiError(409, 'already_submitted', 'This order is already waiting to be confirmed');

	const live = broadcastChange(env, 'orders', `payment submitted ${orderId}`);
	if (ctx) ctx.waitUntil(live);

	return json({ ok: true, order_id: orderId, review_status: 'pending' }, { status: 201 }, cors);
}

// ============================================================
// 12. POST /api/orders/lookup — the student's own order, by roll + phone
// ============================================================
/**
 * The fallback for a confirmation email that never arrived.
 *
 * Roll number ALONE would not do. The QR is a bearer token — whoever holds it collects
 * — and roll numbers are trivially enumerable (IMS24001, IMS24002, …), so a roll-only
 * lookup would let anyone walk the range and pull up other students' passes. The phone
 * number they ordered with is the second factor: known to them, not derivable from the
 * roll.
 *
 * A wrong phone and an unknown roll return the same 404, so this cannot be used to
 * discover which rolls have orders.
 */
export async function orderLookup(env: Env, req: Request, cors: Cors): Promise<Response> {
	await requireBudget(env, req, 'lookup');
	const body = await readJson<{ roll_number?: unknown; phone?: unknown }>(req);

	const rollNumber = normaliseRoll(body.roll_number);
	// The same normalisation parseCustomer applies on the way in, so "+91 98765 43210"
	// and "9876543210" match the stored value either way.
	const raw = String(body.phone ?? '').replace(/[\s-]/g, '');
	const phone = raw.replace(/^(\+91|0091|91(?=\d{10}$)|0)/, '');
	if (!/^[6-9]\d{9}$/.test(phone)) throw bad('bad_phone', 'Enter the 10-digit mobile you ordered with');

	const { results } = await env.DB.prepare(
		`SELECT order_id, order_info, total_price_paise, payment_status, collection_status,
		        review_status, payment_ref, review_note, collected_at, created_at, customer_info
		   FROM orders
		  WHERE roll_number = ? COLLATE NOCASE
		  ORDER BY created_at DESC, order_id DESC`,
	)
		.bind(rollNumber)
		.all<{
			order_id: string;
			order_info: string;
			total_price_paise: number;
			payment_status: string;
			collection_status: CollectionStatus;
			review_status: string | null;
			payment_ref: string | null;
			review_note: string | null;
			collected_at: string | null;
			created_at: string;
			customer_info: string | null;
		}>();

	// The phone is matched here rather than in SQL: it lives inside the customer_info
	// JSON blob, and a LIKE over that would match a number appearing in any field.
	const mine = results.filter((o) => {
		try {
			return o.customer_info ? (JSON.parse(o.customer_info) as { phone?: string }).phone === phone : false;
		} catch {
			return false;
		}
	});

	// One dead end for both "no such roll" and "wrong phone" — see the docblock.
	if (mine.length === 0) throw notFound('No order found for those details');

	return json(
		{
			roll_number: rollNumber,
			orders: mine.map((o) => ({
				order_id: o.order_id,
				items: JSON.parse(o.order_info) as PricedLine[],
				total_price_paise: o.total_price_paise,
				payment_status: o.payment_status,
				review_status: o.review_status ?? 'none',
				payment_ref: o.payment_ref,
				review_note: o.review_note,
				collection_status: o.collection_status,
				collected_at: o.collected_at,
				created_at: o.created_at,
				name: safeName(o.customer_info),
				// The collection capability, and only once an admin has confirmed. Same
				// rule getOrder applies.
				qr_payload: o.payment_status === 'paid' ? o.order_id : null,
			})),
		},
		{},
		cors,
	);
}

/** The buyer's name out of customer_info, or '' if the blob is unreadable. */
function safeName(customerInfo: string | null): string {
	if (!customerInfo) return '';
	try {
		return String((JSON.parse(customerInfo) as { name?: string }).name ?? '');
	} catch {
		return '';
	}
}

// ============================================================
// 13. DELETE /api/orders/:order_id — drop an abandoned checkout
// ============================================================
/**
 * Removes an order the student is done with.
 *
 * Two cases reach here, and they are the same operation:
 *
 *   A DRAFT — created at checkout, never paid for. The row exists before any money
 *   moves because the server has to price the cart itself, so every abandoned basket
 *   leaves one behind. The storefront drops these when the popup closes.
 *
 *   A REJECTED order — the student submitted a payment, an admin could not match it,
 *   and rather than correcting it they would rather the whole thing went away.
 *
 * Never a paid one, and never one waiting in the review queue: an admin may be looking
 * at that screenshot right now, and a paid order is a record of money that moved.
 *
 * Unauthenticated, like the rest of the order routes: the id is 128 bits of randomness
 * known only to whoever placed the order, and neither case is worth anything to
 * somebody who did somehow guess one.
 */
export async function abandonOrder(
	env: Env,
	req: Request,
	orderId: string,
	cors: Cors,
): Promise<Response> {
	await requireBudget(env, req, 'checkout');
	if (!looksLikeOrderId(orderId)) throw bad('bad_order_id', 'Malformed order id');

	// Read the proof path before the row goes, or the object is unreachable afterwards.
	const row = await env.DB.prepare(
		`SELECT payment_proof_path FROM orders WHERE order_id = ?`,
	)
		.bind(orderId)
		.first<{ payment_proof_path: string | null }>();

	// Guarded in the statement, not around it: a close racing a payment submission, or
	// a cancel racing an admin's confirm, both resolve at the database rather than in a
	// check that has already gone stale by the time the DELETE runs.
	const res = await env.DB.prepare(
		`DELETE FROM orders
		  WHERE order_id = ? AND payment_status = 'unpaid'
		    AND (review_status IS NULL OR review_status IN ('none', 'rejected'))`,
	)
		.bind(orderId)
		.run();

	// Only once the row is actually gone. Deleting the object first would orphan a live
	// order's screenshot if the DELETE then found the order had been confirmed.
	if (res.meta.changes && row?.payment_proof_path)
		await env.MEDIA.delete(row.payment_proof_path).catch((e) =>
			console.error('orders: could not delete proof for cancelled', orderId, e),
		);

	// Not an error either way. The order may already be gone, or may have become real
	// between the student pressing cancel and this arriving — and a browser that is
	// being closed has nothing useful to do with a failure.
	return json({ ok: true, removed: res.meta.changes > 0 }, {}, cors);
}
