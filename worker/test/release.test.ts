/**
 * The shop-wide release switch.
 *
 * readRelease decides whether the storefront shows merch or a "dropping soon" page, so
 * the interesting case is not the happy path — it is the MISSING ROW. A deployment that
 * predates the migration has no row to read, and the two ways to treat that are not
 * equally wrong: defaulting to closed would take a working shop dark the moment the code
 * shipped, before anyone had a button to turn it back on. It defaults to open, and this
 * pins that down.
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
} | null;

/** Just enough D1 to answer the one SELECT readRelease makes. */
const dbWith = (row: Row) =>
	({ DB: { prepare: () => ({ first: async () => row }) } }) as unknown as Env;

const row = (status: number): Row => ({
	activation_status: status,
	changed_by_name: 'Test Admin',
	changed_by_roll: 'IMS24038',
	changed_at: '2026-09-09 19:31:15',
});

describe('readRelease', () => {
	it('reports a missing row as OPEN, not closed', async () => {
		// A switch whose job is closing the shop must not be able to close it by
		// failing to exist. listMerch defaults the same way; if one of them ever
		// changes, this test and that one have to be changed together.
		const r = await readRelease(dbWith(null));
		assert.equal(r.active, true);
		assert.equal(r.by_name, null);
		assert.equal(r.at, null);
	});

	it('reads 1 as open and 0 as closed', async () => {
		assert.equal((await readRelease(dbWith(row(1)))).active, true);
		assert.equal((await readRelease(dbWith(row(0)))).active, false);
	});

	it('is strict about 1 — anything else is closed', async () => {
		// The column has a CHECK constraint, so these should be unreachable. The point
		// is that a stray value fails SHUT rather than opening the shop by truthiness,
		// which is what `Boolean(status)` would have done.
		for (const v of [2, -1, 99]) {
			assert.equal((await readRelease(dbWith(row(v)))).active, false, `status ${v} must not open the shop`);
		}
	});

	it('carries the attribution through, so the panel can name who flipped it', async () => {
		const r = await readRelease(dbWith(row(1)));
		assert.equal(r.by_name, 'Test Admin');
		assert.equal(r.by_roll, 'IMS24038');
		assert.equal(r.at, '2026-09-09 19:31:15');
	});
});
