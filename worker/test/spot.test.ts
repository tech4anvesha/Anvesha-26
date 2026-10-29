/**
 * The stall pass.
 *
 * The whole point of spot sales is that the code works for exactly one student, once,
 * for a few minutes. Those are three separate ways to say no, and requireSpotPass is
 * the single place that says them — every catalogue, quote and submission carrying a
 * code goes through it, so a hole here is a hole in a store that is supposed to be shut
 * to the internet.
 *
 *   npm test        (node --test, using Node's native TS type stripping)
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PASS_MINUTES, looksLikeSpotPass, requireSpotPass } from '../src/spot.ts';
import { ApiError, type Env, randomId } from '../src/util.ts';

type Row = {
	pass_id: string;
	issued_at: string;
	expires_at: string;
	claimed_at: string | null;
	used_at: string | null;
	order_id: string | null;
	expired: number;
} | null;

/** Just enough D1 to answer the one SELECT requireSpotPass makes. */
const envWith = (row: Row): Env =>
	({
		DB: {
			prepare: () => ({
				bind: () => ({ first: async () => row }),
			}),
		},
	}) as unknown as Env;

const live = (over: Partial<NonNullable<Row>> = {}): Row => ({
	pass_id: 'SPT_0123456789ABCDEFGHJKMNPQRS',
	issued_at: '2026-10-29 12:00:00',
	expires_at: '2026-10-29 12:20:00',
	claimed_at: null,
	used_at: null,
	order_id: null,
	expired: 0,
	...over,
});

/** The code and the status it comes back as, which is what the page branches on. */
async function refusal(row: Row): Promise<[number, string]> {
	try {
		await requireSpotPass(envWith(row), live()!.pass_id);
		return [0, 'accepted'];
	} catch (e) {
		const err = e as ApiError;
		return [err.status, err.code];
	}
}

describe('pass shape', () => {
	it('accepts what randomId mints', () => {
		assert.equal(looksLikeSpotPass(randomId('SPT_')), true);
	});

	it('refuses an order id, a session id and junk', () => {
		// Checked before any DB round trip, and the prefixes matter: an order id is the
		// collection capability and must not be usable as a door into the store.
		// Right length, wrong prefix: it is the prefix doing the work on these two.
		assert.equal(looksLikeSpotPass('ORD_0123456789ABCDEFGHJKMNPQRS'), false);
		assert.equal(looksLikeSpotPass('DST_0123456789ABCDEFGHJKMNPQRS'), false);
		assert.equal(looksLikeSpotPass('SPT_short'), false);
		// I, L, O and U are not in the alphabet — they are the characters people misread.
		assert.equal(looksLikeSpotPass('SPT_0123456789ABCDEFGHIKMNPQRS'), false);
		assert.equal(looksLikeSpotPass(null), false);
		assert.equal(looksLikeSpotPass(42), false);
	});
});

describe('requireSpotPass', () => {
	it('lets a fresh code through', async () => {
		const pass = await requireSpotPass(envWith(live()), live()!.pass_id);
		assert.equal(pass.pass_id, live()!.pass_id);
		// `expired` is the gate's own working, not something a caller should see.
		assert.equal('expired' in pass, false);
	});

	it('still lets a CLAIMED code through', async () => {
		// Claiming frees the stall screen; it does not end the student's shopping. If this
		// ever refused, every stall order would die between the scan and the submit.
		const pass = await requireSpotPass(envWith(live({ claimed_at: '2026-10-29 12:01:00' })), live()!.pass_id);
		assert.equal(pass.claimed_at, '2026-10-29 12:01:00');
	});

	it('refuses a used code — one pass, one order', async () => {
		assert.deepEqual(await refusal(live({ used_at: '2026-10-29 12:05:00' })), [410, 'pass_used']);
	});

	it('refuses an expired code', async () => {
		assert.deepEqual(await refusal(live({ expired: 1 })), [410, 'pass_expired']);
	});

	it('prefers "used" over "expired" when a code is both', async () => {
		// The order that spent it is the thing worth knowing; expiry afterwards is noise.
		assert.deepEqual(await refusal(live({ used_at: '2026-10-29 12:05:00', expired: 1 })), [410, 'pass_used']);
	});

	it('404s an unknown code, and says the same thing for a malformed one', async () => {
		// Deliberately identical: a 404 that distinguished "wrong shape" from "no such
		// row" would confirm which codes had once existed.
		assert.deepEqual(await refusal(null), [404, 'no_such_pass']);

		try {
			await requireSpotPass(envWith(live()), 'not-a-pass');
			assert.fail('expected a refusal');
		} catch (e) {
			assert.equal((e as ApiError).status, 404);
			assert.equal((e as ApiError).code, 'no_such_pass');
		}
	});
});

describe('the window', () => {
	it('is long enough to pay by UPI and short enough to be no use later', () => {
		// Not an arbitrary number: a student has to open a banking app, pay, screenshot it
		// and upload on stall wifi. Below ~10 minutes that fails honest people; above ~30
		// an abandoned code is a way into a closed store for half an hour.
		assert.ok(PASS_MINUTES >= 10 && PASS_MINUTES <= 30);
	});
});
