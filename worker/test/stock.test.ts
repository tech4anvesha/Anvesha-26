/**
 * Stock counters.
 *
 * The counter is the only thing standing between a box of 9 medium shirts and a tenth
 * order for one, and the rules are not symmetric: checkout refuses, submit never does,
 * and a restore must never invent inventory. Each of those is a separate way to lose
 * real money, so each is tested on its own.
 *
 *   npm test        (node --test, using Node's native TS type stripping)
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PricedLine } from '../src/cart.ts';
import { linesOf, readStock, requireStock, returnStock, takeStock } from '../src/stock.ts';
import { ApiError, type Env } from '../src/util.ts';

type Row = { merch_id: string; size: string; qty: number };

/**
 * D1, reduced to the three things stock.ts asks of it: read every counter, and run
 * batches of UPDATEs whose WHERE clause is the guard being tested. The fake applies
 * `qty >= ?` itself, because that clause IS the concurrency control — a stub that
 * ignored it would pass every test while the real thing oversold.
 */
function fakeDb(rows: Row[]) {
	const shelf = new Map(rows.map((r) => [`${r.merch_id}|${r.size}`, r.qty]));
	const ran: string[] = [];

	const prepare = (sql: string) => ({
		bind: (...args: unknown[]) => ({
			all: async () => ({
				results: [...shelf].map(([k, qty]) => {
					const [merch_id, size] = k.split('|');
					return { merch_id, size, qty };
				}),
			}),
			// The shape batch() consumes.
			__sql: sql,
			__args: args,
		}),
		all: async () => ({
			results: [...shelf].map(([k, qty]) => {
				const [merch_id, size] = k.split('|');
				return { merch_id, size, qty };
			}),
		}),
	});

	const env = {
		DB: {
			prepare,
			batch: async (stmts: { __sql: string; __args: unknown[] }[]) =>
				stmts.map((st) => {
					const take = st.__sql.includes('qty - ?');
					const [qty, merch_id, size, floor] = st.__args as [number, string, string, number];
					const key = `${merch_id}|${size}`;
					const have = shelf.get(key);
					ran.push(`${take ? 'take' : 'give'} ${key} ${qty}`);

					if (have === undefined) return { meta: { changes: 0 } };
					if (take) {
						// The real guard: `WHERE ... AND qty >= ?`.
						if (have < floor) return { meta: { changes: 0 } };
						shelf.set(key, have - qty);
					} else {
						shelf.set(key, have + qty);
					}
					return { meta: { changes: 1 } };
				}),
		},
	} as unknown as Env;

	return { env, shelf, ran };
}

const line = (merch_id: string, size: string | null, quantity: number): PricedLine => ({
	merch_id,
	name: merch_id === 'MER_TEE' ? 'Dragon Warrior' : 'Astraea Gaze',
	quantity,
	size: size as PricedLine['size'],
	unit_price_paise: 45000,
	line_total_paise: 45000 * quantity,
	collected: 0,
});

const shelfOf = () => [
	{ merch_id: 'MER_TEE', size: 'M', qty: 9 },
	{ merch_id: 'MER_TEE', size: 'S', qty: 1 },
	{ merch_id: 'MER_TEE', size: 'XS', qty: 0 },
	{ merch_id: 'MER_STICK', size: '', qty: 11 },
];

describe('readStock', () => {
	it('keys by item and size, with the empty slot for unsized items', async () => {
		const { env } = fakeDb(shelfOf());
		const map = await readStock(env);
		assert.equal(map.MER_TEE.M, 9);
		assert.equal(map.MER_STICK[''], 11);
	});
});

describe('requireStock — the refusal before any money moves', () => {
	it('passes a cart that can be filled', async () => {
		const { env } = fakeDb(shelfOf());
		await requireStock(env, [line('MER_TEE', 'M', 2), line('MER_STICK', null, 3)]);
	});

	it('refuses more than there are, and says how many are left', async () => {
		const { env } = fakeDb(shelfOf());
		await assert.rejects(
			() => requireStock(env, [line('MER_TEE', 'S', 2)]),
			(e: ApiError) => {
				assert.equal(e.status, 409);
				assert.equal(e.code, 'out_of_stock');
				// The number matters: somebody holding two needs to know one is available,
				// not that they should give up.
				assert.match(e.message, /Only 1 /);
				assert.match(e.message, /\(S\)/);
				return true;
			},
		);
	});

	it('calls a zero slot sold out rather than "only 0 left"', async () => {
		const { env } = fakeDb(shelfOf());
		await assert.rejects(
			() => requireStock(env, [line('MER_TEE', 'XS', 1)]),
			(e: ApiError) => e.code === 'out_of_stock' && /sold out/.test(e.message),
		);
	});

	it('treats a missing row as zero, never as unlimited', async () => {
		// The whole failure mode this design exists to prevent: an item nobody stocked
		// must be unsellable, not infinite.
		const { env } = fakeDb(shelfOf());
		await assert.rejects(
			() => requireStock(env, [line('MER_NEW', null, 1)]),
			(e: ApiError) => e.code === 'out_of_stock',
		);
	});

	it('sums repeated lines for one slot before deciding', async () => {
		// Two lines of 1 against a shelf of 1 is a cart for two, and checking each line
		// on its own would wave it through.
		const { env } = fakeDb(shelfOf());
		await assert.rejects(
			() => requireStock(env, [line('MER_TEE', 'S', 1), line('MER_TEE', 'S', 1)]),
			(e: ApiError) => e.code === 'out_of_stock',
		);
	});
});

describe('takeStock — decrement, and report honestly', () => {
	it('takes every line and says so', async () => {
		const { env, shelf } = fakeDb(shelfOf());
		assert.equal(await takeStock(env, [line('MER_TEE', 'M', 2), line('MER_STICK', null, 1)]), true);
		assert.equal(shelf.get('MER_TEE|M'), 7);
		assert.equal(shelf.get('MER_STICK|'), 10);
	});

	it('returns false when a line could not be taken, and does not go negative', async () => {
		// The honest answer when the shelf ran out between checkout and submit. The order
		// is still filed — the student has already paid — and this false is what flags it.
		const { env, shelf } = fakeDb(shelfOf());
		assert.equal(await takeStock(env, [line('MER_TEE', 'S', 2)]), false);
		assert.equal(shelf.get('MER_TEE|S'), 1);
	});

	it('returns false for an item with no counter at all', async () => {
		const { env } = fakeDb(shelfOf());
		assert.equal(await takeStock(env, [line('MER_NEW', null, 1)]), false);
	});

	it('is a no-op on an empty cart rather than an empty batch', async () => {
		// D1 rejects a batch with no statements, so this has to short-circuit.
		const { env, ran } = fakeDb(shelfOf());
		assert.equal(await takeStock(env, []), true);
		assert.deepEqual(ran, []);
	});
});

describe('returnStock — put it back without inventing any', () => {
	it('adds exactly what was taken', async () => {
		const { env, shelf } = fakeDb(shelfOf());
		await takeStock(env, [line('MER_TEE', 'M', 3)]);
		assert.equal(shelf.get('MER_TEE|M'), 6);
		await returnStock(env, [line('MER_TEE', 'M', 3)]);
		assert.equal(shelf.get('MER_TEE|M'), 9);
	});

	it('round-trips a whole order', async () => {
		const { env, shelf } = fakeDb(shelfOf());
		const order = [line('MER_TEE', 'M', 2), line('MER_STICK', null, 4)];
		await takeStock(env, order);
		await returnStock(env, order);
		assert.equal(shelf.get('MER_TEE|M'), 9);
		assert.equal(shelf.get('MER_STICK|'), 11);
	});
});

describe('linesOf — reading an order back for a restore', () => {
	it('reads the stored shape', () => {
		const json = JSON.stringify([{ merch_id: 'MER_TEE', size: 'M', quantity: 2 }]);
		assert.deepEqual(linesOf(json), [{ merch_id: 'MER_TEE', size: 'M', quantity: 2 }]);
	});

	it('returns nothing rather than throwing on anything unreadable', () => {
		// A rejection must not fail because one order's JSON is malformed — that would
		// leave an admin unable to act on the row at all.
		assert.deepEqual(linesOf(null), []);
		assert.deepEqual(linesOf('not json'), []);
		assert.deepEqual(linesOf('{"not":"an array"}'), []);
	});

	it('drops lines that would corrupt a counter', () => {
		const json = JSON.stringify([
			{ merch_id: 'MER_TEE', size: 'M', quantity: 2 },
			{ merch_id: 'MER_TEE', size: 'L', quantity: -5 },   // would ADD stock on a take
			{ merch_id: 'MER_TEE', size: 'S', quantity: 1.5 },  // not a countable thing
			{ size: 'XL', quantity: 1 },                        // no item at all
		]);
		assert.deepEqual(linesOf(json), [{ merch_id: 'MER_TEE', size: 'M', quantity: 2 }]);
	});
});
