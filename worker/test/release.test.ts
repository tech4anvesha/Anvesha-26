/**
 * The two merch_release switches.
 *
 * readRelease decides whether the storefront shows merch and whether its checkout is
 * on, so the interesting case is not the happy path — it is the MISSING ROW. A
 * deployment that predates the migration has no row to read, and the two switches
 * must default in OPPOSITE directions: the shop stays visible (closing it by accident
 * would take a working store dark before anyone had a button to fix it), and sales
 * stay off (taking money by accident is not something a default should ever do).
 *
 *   npm test        (node --test, using Node's native TS type stripping)
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readRelease } from '../src/admin.ts';
import type { Env } from '../src/util.ts';

type Row = {
	activation_status: number;
	changed_by_name: string | null;
	changed_by_roll: string | null;
	changed_at: string | null;
	sale_activation: number | null;
	sale_activation_changed_by_name: string | null;
	sale_activation_changed_by_roll: string | null;
	sale_activation_changed_at: string | null;
} | null;

/** Just enough D1 to answer the one SELECT readRelease makes. */
const dbWith = (row: Row, env: Partial<Env> = {}) =>
	({ ...env, DB: { prepare: () => ({ first: async () => row }) } }) as unknown as Env;

const row = (shop: number, sales: number | null = 0): Row => ({
	activation_status: shop,
	changed_by_name: 'Shop Admin',
	changed_by_roll: 'IMS24001',
	changed_at: '2026-09-09 19:31:15',
	sale_activation: sales,
	sale_activation_changed_by_name: 'Sales Admin',
	sale_activation_changed_by_roll: 'IMS24002',
	sale_activation_changed_at: '2026-09-14 12:00:00',
});

describe('readRelease', () => {
	it('a missing row: shop OPEN, sales CLOSED — opposite defaults, on purpose', async () => {
		const r = await readRelease(dbWith(null));
		assert.equal(r.shop.active, true);
		assert.equal(r.sales.active, false);
		assert.equal(r.shop.by_name, null);
		assert.equal(r.sales.by_name, null);
	});

	it('reads each switch from its own column, independently', async () => {
		assert.deepEqual(
			[(await readRelease(dbWith(row(1, 1)))).shop.active, (await readRelease(dbWith(row(1, 1)))).sales.active],
			[true, true]);
		assert.deepEqual(
			[(await readRelease(dbWith(row(1, 0)))).shop.active, (await readRelease(dbWith(row(1, 0)))).sales.active],
			[true, false]);
		assert.deepEqual(
			[(await readRelease(dbWith(row(0, 1)))).shop.active, (await readRelease(dbWith(row(0, 1)))).sales.active],
			[false, true]);
	});

	it('a NULL sale_activation (row older than the second migration) reads as closed', async () => {
		assert.equal((await readRelease(dbWith(row(1, null)))).sales.active, false);
	});

	it('is strict about 1 — anything else is off, for both switches', async () => {
		// Both columns carry a CHECK constraint, so these should be unreachable. The
		// point is that a stray value fails SHUT rather than opening by truthiness.
		for (const v of [2, -1, 99]) {
			assert.equal((await readRelease(dbWith(row(v, v)))).shop.active, false, `shop ${v}`);
			assert.equal((await readRelease(dbWith(row(v, v)))).sales.active, false, `sales ${v}`);
		}
	});

	it('keeps the two attribution trios apart', async () => {
		const r = await readRelease(dbWith(row(1, 1)));
		assert.equal(r.shop.by_name, 'Shop Admin');
		assert.equal(r.shop.by_roll, 'IMS24001');
		assert.equal(r.sales.by_name, 'Sales Admin');
		assert.equal(r.sales.by_roll, 'IMS24002');
		assert.equal(r.sales.at, '2026-09-14 12:00:00');
	});

	it('reports the gateway state beside the switches, so the panel can explain itself', async () => {
		const none = await readRelease(dbWith(row(1, 1)));
		assert.deepEqual(none.gateway, { mode: 'test', configured: false, counter: false });

		const test = await readRelease(dbWith(row(1, 1), { RAZORPAY_TEST_KEY_ID: 'a', RAZORPAY_TEST_KEY_SECRET: 'b' }));
		assert.deepEqual(test.gateway, { mode: 'test', configured: true, counter: false });

		const live = await readRelease(dbWith(row(1, 1), { RAZORPAY_MODE: 'live', RAZORPAY_LIVE_KEY_ID: 'a', RAZORPAY_LIVE_KEY_SECRET: 'b' }));
		assert.deepEqual(live.gateway, { mode: 'live', configured: true, counter: false });

		const counter = await readRelease(dbWith(row(1, 1), { DIRECT_PAY: '1' }));
		assert.deepEqual(counter.gateway, { mode: 'test', configured: true, counter: true });
	});
});

import { paymentConfigured, razorpayKeys, razorpayMode } from '../src/util.ts';

describe('razorpayMode / razorpayKeys', () => {
	const both = {
		RAZORPAY_TEST_KEY_ID: 'rzp_test_x', RAZORPAY_TEST_KEY_SECRET: 'ts',
		RAZORPAY_LIVE_KEY_ID: 'rzp_live_x', RAZORPAY_LIVE_KEY_SECRET: 'ls',
	};

	it('defaults to test — the only safe answer for a missing or misspelt mode', () => {
		for (const m of [undefined, '', 'LIVE', 'Live', 'prod', 'production', 'true'])
			assert.equal(razorpayMode({ RAZORPAY_MODE: m } as Env), 'test', `mode ${String(m)} must not be live`);
		assert.equal(razorpayMode({ RAZORPAY_MODE: 'live' } as Env), 'live');
	});

	it('hands back the set the mode names, and only that set', () => {
		assert.deepEqual(razorpayKeys({ ...both, RAZORPAY_MODE: 'test' } as Env),
			{ mode: 'test', keyId: 'rzp_test_x', keySecret: 'ts', webhookSecret: undefined });
		assert.deepEqual(razorpayKeys({ ...both, RAZORPAY_MODE: 'live' } as Env),
			{ mode: 'live', keyId: 'rzp_live_x', keySecret: 'ls', webhookSecret: undefined });
	});

	it('is null when the ACTIVE set is incomplete, even if the other set is whole', () => {
		// Live mode with only test keys set: must not fall back to test keys.
		const testOnly = { RAZORPAY_MODE: 'live', RAZORPAY_TEST_KEY_ID: 'rzp_test_x', RAZORPAY_TEST_KEY_SECRET: 'ts' };
		assert.equal(razorpayKeys(testOnly as Env), null);
		// Half a set is no set.
		assert.equal(razorpayKeys({ RAZORPAY_TEST_KEY_ID: 'rzp_test_x' } as Env), null);
		assert.equal(razorpayKeys({ RAZORPAY_TEST_KEY_SECRET: 'ts' } as Env), null);
	});

	it('paymentConfigured is true for the counter path OR a whole key set, else false', () => {
		assert.equal(paymentConfigured({} as Env), false);
		assert.equal(paymentConfigured({ DIRECT_PAY: '1' } as Env), true);
		assert.equal(paymentConfigured({ DIRECT_PAY: '0' } as Env), false);
		assert.equal(paymentConfigured({ RAZORPAY_TEST_KEY_ID: 'a', RAZORPAY_TEST_KEY_SECRET: 'b' } as Env), true);
		assert.equal(paymentConfigured({ RAZORPAY_TEST_KEY_ID: 'a' } as Env), false);
	});
});
