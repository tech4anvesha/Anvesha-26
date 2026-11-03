/**
 * collectItems is the only writer of order_info's per-line `collected` flags and of
 * collection_status — a bug here either hands out merch twice or leaves it stuck
 * "pending" forever. It now does the whole merge inside one SQL statement, so it is
 * tested against a real SQLite (test/sqlite-d1.ts) loaded with the real schema, not a
 * stub that would only be checking itself.
 *
 * Also covered: the counter's session gate, which now rides inside the same round trip
 * as the scan, the lookup and the collect.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { type PricedLine } from '../src/cart.ts';
import { sessionGate } from '../src/distribution.ts';
import { collectItems, lookupByRoll, scanOrder } from '../src/routes.ts';
import { ApiError, type Env, randomId } from '../src/util.ts';
import { sqliteD1 } from './sqlite-d1.ts';

const line = (over: Partial<PricedLine> = {}): PricedLine => ({
	merch_id: 'MER_TEST0000',
	name: 'Trial Tee',
	quantity: 1,
	size: null,
	unit_price_paise: 10000,
	line_total_paise: 10000,
	collected: 0,
	...over,
});

/** A fresh database with one order in it, plus an open and an ended counter session. */
function setup(order: {
	items: PricedLine[] | object[];
	payment_status?: string;
	collection_status?: string;
	collected_at?: string | null;
}) {
	const { db, d1 } = sqliteD1('../schema.sql', '../schema-admin.sql');
	const id = randomId('ORD_');
	db.prepare(
		`INSERT INTO orders (order_id, order_info, total_price_paise, payment_status, collection_status, collected_at, roll_number)
		 VALUES (?, ?, 10000, ?, ?, ?, 'IMS24101')`,
	).run(id, JSON.stringify(order.items), order.payment_status ?? 'paid', order.collection_status ?? 'pending', order.collected_at ?? null);
	const open = randomId('DST_');
	const ended = randomId('DST_');
	db.prepare(`INSERT INTO distributions (session_id) VALUES (?)`).run(open);
	db.prepare(`INSERT INTO distributions (session_id, end_time) VALUES (?, datetime('now'))`).run(ended);
	const env = { DB: d1 } as unknown as Env;
	const row = () => db.prepare(`SELECT order_info, collection_status, collected_at FROM orders WHERE order_id = ?`).get(id) as {
		order_info: string; collection_status: string; collected_at: string | null;
	};
	return { env, id, open, ended, row, items: () => JSON.parse(row().order_info) as PricedLine[] };
}

async function statusOf(fn: () => Promise<unknown>): Promise<number> {
	try {
		await fn();
		return 200;
	} catch (e) {
		assert.ok(e instanceof ApiError, `expected an ApiError, got ${String(e)}`);
		return e.status;
	}
}

describe('collectItems — one statement, real SQL', () => {
	it('strikes one line off a two-line order and leaves it partial', async () => {
		const t = setup({ items: [line({ name: 'A' }), line({ name: 'B' })] });
		const body = (await (await collectItems(t.env, t.id, [0], {})).json()) as any;
		assert.equal(body.collection_status, 'partial');
		assert.deepEqual(body.items.map((l: PricedLine) => l.collected), [1, 0]);
		assert.equal(body.collected_at, null);
		// The row agrees with the response, line order and all.
		assert.deepEqual(t.items().map((l) => [l.name, l.collected]), [['A', 1], ['B', 0]]);
		assert.equal(t.row().collection_status, 'partial');
	});

	it('reaches collected only once every line is struck off, and stamps collected_at', async () => {
		const t = setup({ items: [line({ name: 'A', collected: 1 }), line({ name: 'B' })], collection_status: 'partial' });
		const body = (await (await collectItems(t.env, t.id, [1], {})).json()) as any;
		assert.equal(body.collection_status, 'collected');
		assert.match(body.collected_at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
		assert.equal(t.row().collected_at, body.collected_at, 'the response carries D1\'s own stamp');
	});

	it('two volunteers ticking different lines both succeed — no "rescan"', async () => {
		// The old read-merge-write refused the second of these whenever they overlapped.
		const t = setup({ items: [line({ name: 'A' }), line({ name: 'B' })] });
		const [a, b] = await Promise.all([collectItems(t.env, t.id, [0], {}), collectItems(t.env, t.id, [1], {})]);
		assert.equal(a.status, 200);
		assert.equal(b.status, 200);
		assert.equal(t.row().collection_status, 'collected');
		assert.deepEqual(t.items().map((l) => l.collected), [1, 1]);
	});

	it('a line already struck off stays struck off even if selected again', async () => {
		const t = setup({ items: [line({ name: 'A', collected: 1 }), line({ name: 'B' })], collection_status: 'partial' });
		await collectItems(t.env, t.id, [0, 1], {});
		assert.deepEqual(t.items().map((l) => l.collected), [1, 1]);
	});

	it('omitting `lines` collects everything still outstanding — "Mark All"', async () => {
		const t = setup({ items: [line({ name: 'A' }), line({ name: 'B' }), line({ name: 'C', collected: 1 })], collection_status: 'partial' });
		const body = (await (await collectItems(t.env, t.id, undefined, {})).json()) as any;
		assert.equal(body.collection_status, 'collected');
		assert.deepEqual(t.items().map((l) => l.collected), [1, 1, 1]);
	});

	it('an old row with no `collected` flags is read as all-outstanding and gains them', async () => {
		const legacy = [{ merch_id: 'MER_X', name: 'A', quantity: 1 }, { merch_id: 'MER_Y', name: 'B', quantity: 1 }];
		const t = setup({ items: legacy });
		await collectItems(t.env, t.id, [1], {});
		assert.deepEqual(t.items().map((l) => l.collected), [0, 1]);
		assert.equal(t.row().collection_status, 'partial');
	});

	it('refuses an unpaid order, and writes nothing', async () => {
		const t = setup({ items: [line()], payment_status: 'unpaid' });
		assert.equal(await statusOf(() => collectItems(t.env, t.id, [0], {})), 409);
		assert.equal(t.items()[0].collected, 0);
	});

	it('refuses an order that is already fully collected', async () => {
		const t = setup({ items: [line({ collected: 1 })], collection_status: 'collected', collected_at: '2026-11-01 10:00:00' });
		assert.equal(await statusOf(() => collectItems(t.env, t.id, [0], {})), 409);
	});

	it('404s an order that does not exist', async () => {
		const t = setup({ items: [line()] });
		assert.equal(await statusOf(() => collectItems(t.env, randomId('ORD_'), [0], {})), 404);
	});

	it('rejects an index outside the order, and writes nothing', async () => {
		const t = setup({ items: [line()] });
		assert.equal(await statusOf(() => collectItems(t.env, t.id, [1], {})), 400);
		assert.equal(await statusOf(() => collectItems(t.env, t.id, [0, 5], {})), 400);
		assert.equal(t.items()[0].collected, 0, 'a bad index must not strike off the good one beside it');
	});

	it('rejects a non-array, an empty array and a negative index before touching the row', async () => {
		const t = setup({ items: [line()] });
		for (const bad of ['nope', [], [-1], [0.5]]) {
			assert.equal(await statusOf(() => collectItems(t.env, t.id, bad, {})), 400, JSON.stringify(bad));
		}
	});
});

describe('the counter session gate', () => {
	it('lets a collect through an open session', async () => {
		const t = setup({ items: [line()] });
		const res = await collectItems(t.env, t.id, [0], {}, sessionGate(t.env, t.open));
		assert.equal(res.status, 200);
	});

	it('an ended session is 410 inside the same statement — and nothing is collected', async () => {
		const t = setup({ items: [line()] });
		assert.equal(await statusOf(() => collectItems(t.env, t.id, [0], {}, sessionGate(t.env, t.ended))), 410);
		assert.equal(t.items()[0].collected, 0);
		assert.equal(t.row().collection_status, 'pending');
	});

	it('an unknown session is 404', async () => {
		const t = setup({ items: [line()] });
		assert.equal(await statusOf(() => collectItems(t.env, t.id, [0], {}, sessionGate(t.env, randomId('DST_')))), 404);
	});

	it('a malformed session id is refused before any database work', () => {
		const t = setup({ items: [line()] });
		assert.throws(() => sessionGate(t.env, 'DST_nope'), (e: unknown) => e instanceof ApiError && e.status === 404);
	});

	it('a dead link outranks a bad QR: an ended session with a junk code is still 410', async () => {
		const t = setup({ items: [line()] });
		assert.equal(await statusOf(() => scanOrder(t.env, 'not-an-order', {}, sessionGate(t.env, t.ended))), 410);
	});

	it('scan and lookup check the session in the same batch as the read', async () => {
		const t = setup({ items: [line()] });
		const scan = (await (await scanOrder(t.env, t.id, {}, sessionGate(t.env, t.open))).json()) as any;
		assert.equal(scan.order.order_id, t.id);
		const look = (await (await lookupByRoll(t.env, 'ims24101', {}, sessionGate(t.env, t.open))).json()) as any;
		assert.equal(look.orders[0].order_id, t.id);

		assert.equal(await statusOf(() => scanOrder(t.env, t.id, {}, sessionGate(t.env, t.ended))), 410);
		assert.equal(await statusOf(() => lookupByRoll(t.env, 'IMS24101', {}, sessionGate(t.env, t.ended))), 410);
	});

	it('the admin path has no gate and is unaffected', async () => {
		const t = setup({ items: [line()] });
		const scan = (await (await scanOrder(t.env, t.id, {})).json()) as any;
		assert.equal(scan.order.order_id, t.id);
	});
});
