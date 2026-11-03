/**
 * The admin order feed: what crosses the socket when an order changes, and where.
 *
 * The two things that must hold: the payload is the row exactly as the panel's list
 * would show it (so the panel can swap one <tr> and stay correct), and it goes to the
 * 'admin' channel — never the public one, which every storefront visitor holds open
 * and which would otherwise hand out order ids, the collection capability.
 *
 *   npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { broadcastOrder, orderRows } from '../src/orderfeed.ts';
import { type Env, randomId } from '../src/util.ts';

const ORDER = randomId('ORD_');

const ROW = {
	order_id: ORDER,
	order_info: JSON.stringify([{ merch_id: 'MER_TEST0000', name: 'Tee', quantity: 1, size: 'M', unit_price_paise: 50000, line_total_paise: 50000, collected: 1 }]),
	total_price_paise: 50000,
	payment_status: 'paid',
	collection_status: 'collected',
	roll_number: 'IMS24101',
	collected_at: '2026-11-03 03:00:00',
	created_at: '2026-11-01 10:00:00',
	customer_info: JSON.stringify({ name: 'Asha R', email: 'asha@iisertvm.ac.in', phone: '9999999999' }),
	review_status: 'confirmed',
	payment_ref: 'UTR123',
	payment_proof_path: 'proofs/x.jpg',
	payment_submitted_at: null,
	reviewed_by_name: 'Admin',
	reviewed_at: null,
	review_note: null,
	spot_pass: null,
	stock_taken: 1,
	razorpay_transaction_id: null,
	transaction_info: null,
};

/** D1 that serves `rows` and records every query; a hub that records every send. */
function fakeEnv(rows: object[]) {
	const queries: { sql: string; args: unknown[] }[] = [];
	const sent: { payload: string; channel?: string }[] = [];
	const stmt = (sql: string, args: unknown[] = []): any => ({
		bind: (...a: unknown[]) => stmt(sql, a),
		all: async () => (queries.push({ sql, args }), { results: rows }),
	});
	const env = {
		DB: { prepare: (sql: string) => stmt(sql) },
		HUB: {
			idFromName: (n: string) => n,
			get: () => ({ broadcast: async (payload: string, channel?: string) => { sent.push({ payload, channel }); return 1; } }),
		},
	} as unknown as Env;
	return { env, queries, sent };
}

describe('orderRows', () => {
	it('narrows to one order by id, and lists everything without one', async () => {
		const one = fakeEnv([ROW]);
		await orderRows(one.env, ORDER);
		assert.match(one.queries[0].sql, /WHERE o\.order_id = \?/);
		assert.deepEqual(one.queries[0].args, [ORDER]);

		const all = fakeEnv([ROW]);
		await orderRows(all.env);
		assert.doesNotMatch(all.queries[0].sql, /WHERE/);
	});

	it('shapes a row the way the panel reads it — and never ships the R2 key', async () => {
		const { env } = fakeEnv([ROW]);
		const [o] = await orderRows(env, ORDER);
		assert.equal(o.name, 'Asha R'); // filled from customer_info when there is no payment row
		assert.equal(o.transaction_id, 'UTR123');
		assert.equal(o.has_proof, true);
		assert.equal(o.items[0].collected, 1);
		assert.ok(!('payment_proof_path' in o), 'the object path must not leave the worker');
	});
});

describe('broadcastOrder', () => {
	it('sends the changed row, whole, to the admin channel only', async () => {
		const { env, sent } = fakeEnv([ROW]);
		await broadcastOrder(env, ORDER, 'upsert');
		assert.equal(sent.length, 1);
		assert.equal(sent[0].channel, 'admin');
		const msg = JSON.parse(sent[0].payload);
		assert.equal(msg.type, 'order');
		assert.equal(msg.op, 'upsert');
		assert.equal(msg.order.order_id, ORDER);
		assert.equal(msg.order.collection_status, 'collected');
	});

	it('a delete carries the id and nothing else', async () => {
		const { env, sent, queries } = fakeEnv([]);
		await broadcastOrder(env, ORDER, 'delete');
		assert.deepEqual(JSON.parse(sent[0].payload), { type: 'order', op: 'delete', order_id: ORDER });
		assert.equal(sent[0].channel, 'admin');
		assert.equal(queries.length, 0, 'nothing to read for a row that is gone');
	});

	it('an upsert for a row that has vanished becomes a delete', async () => {
		const { env, sent } = fakeEnv([]);
		await broadcastOrder(env, ORDER, 'upsert');
		assert.equal(JSON.parse(sent[0].payload).op, 'delete');
	});

	it('swallows a hub failure — the write it follows has already committed', async () => {
		const { env } = fakeEnv([ROW]);
		(env as any).HUB.get = () => ({ broadcast: async () => { throw new Error('hub down'); } });
		await assert.doesNotReject(broadcastOrder(env, ORDER, 'upsert'));
	});
});
