/**
 * The three things here that can be silently wrong: the IST clock the sweep compares
 * against, the link validator standing between an admin's paste and an href on the
 * page, and the sweep's own boundary.
 *
 *   npm test        (node --test, using Node's native TS type stripping)
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import worker, { type Env, istStamp, looksLikeEventId, newEventId, sweep } from '../src/index.ts';

describe('istStamp', () => {
	it('is UTC plus 5:30, formatted for the column', () => {
		// 2026-02-14T04:30:00Z is exactly 10:00 IST.
		assert.equal(istStamp(Date.parse('2026-02-14T04:30:00Z')), '2026-02-14 10:00');
	});

	it('rolls the date over at 18:30 UTC', () => {
		assert.equal(istStamp(Date.parse('2026-02-14T18:29:00Z')), '2026-02-14 23:59');
		assert.equal(istStamp(Date.parse('2026-02-14T18:30:00Z')), '2026-02-15 00:00');
	});
});

describe('newEventId', () => {
	it('produces ids its own matcher accepts', () => {
		for (let i = 0; i < 50; i++) assert.ok(looksLikeEventId(newEventId()));
	});
	it('rejects anything else', () => {
		for (const v of ['', 'EVT_', 'MER_ABCDEFGH', 'EVT_ABCDEFGHI', 'EVT_ABCDEFGI', null]) {
			assert.equal(looksLikeEventId(v), false, String(v));
		}
	});
});

// ---------- a D1 stub: records the SQL it is given, returns fixed metadata ----------
function fakeDb(rows: any[] = []) {
	const seen: { sql: string; args: unknown[] }[] = [];
	const stmt = (sql: string, args: unknown[] = []): any => ({
		bind: (...a: unknown[]) => stmt(sql, a),
		run: async () => (seen.push({ sql, args }), { meta: { changes: rows.length } }),
		all: async () => (seen.push({ sql, args }), { results: rows }),
		first: async () => (seen.push({ sql, args }), rows[0] ?? null),
	});
	return {
		seen,
		db: {
			prepare: (sql: string) => stmt(sql),
			batch: async (stmts: any[]) => {
				for (const s of stmts) await s.run();
				return stmts.map(() => ({ meta: { changes: rows.length } }));
			},
		} as unknown as D1Database,
	};
}

describe('poster upload', () => {
	const form = (file?: File) => { const f = new FormData(); if (file) f.set('poster', file); return f; };
	const post = (body: FormData, auth = true) =>
		new Request('https://api.test/api/events/EVT_00000000/poster', {
			method: 'POST', body, ...(auth ? { headers: { Authorization: 'Bearer tok' } } : {}),
		});

	it('refuses without a session', async () => {
		const { db } = fakeDb([]);
		const res = await worker.fetch(post(form(new File(['x'], 'p.png', { type: 'image/png' })), false), env(db), ctx());
		assert.equal(res.status, 401);
	});

	it('refuses a type R2 would have to transcode', async () => {
		const { db } = signedIn();
		const res = await worker.fetch(post(form(new File(['x'], 'p.svg', { type: 'image/svg+xml' }))), env(db), ctx());
		assert.equal(res.status, 400);
		assert.equal((await res.json() as any).error, 'bad_image_type');
	});

	it('refuses anything over the size cap', async () => {
		const { db } = signedIn();
		const big = new File([new Uint8Array(6 * 1024 * 1024 + 1)], 'p.png', { type: 'image/png' });
		const res = await worker.fetch(post(form(big)), env(db), ctx());
		assert.equal(res.status, 400);
		assert.equal((await res.json() as any).error, 'image_too_large');
	});

	it('refuses a request with no file at all', async () => {
		const { db } = signedIn();
		const res = await worker.fetch(post(form()), env(db), ctx());
		assert.equal(res.status, 400);
	});
});

describe('sweep', () => {
	it('carries the poster across, or an archived event loses its artwork', async () => {
		const { db, seen } = fakeDb([{}]);
		await sweep({ DB: db } as Env, '2026-02-14 10:00');
		assert.match(seen[0].sql, /INSERT OR IGNORE INTO events_done[\s\S]*poster_path/);
		assert.match(seen[0].sql, /SELECT[\s\S]*poster_path[\s\S]*FROM events_scheduled/);
	});

	it('inserts then deletes, both bound to the same cutoff', async () => {
		const { db, seen } = fakeDb([{}, {}]);
		const moved = await sweep({ DB: db } as Env, '2026-02-14 10:00');
		assert.equal(moved, 2);
		assert.equal(seen.length, 2);
		assert.match(seen[0].sql, /INSERT OR IGNORE INTO events_done/);
		assert.match(seen[1].sql, /DELETE FROM events_scheduled/);
		// Both must use `<=` against the identical stamp, or a row can be deleted
		// without having been archived.
		assert.deepEqual(seen[0].args, ['2026-02-14 10:00']);
		assert.deepEqual(seen[1].args, ['2026-02-14 10:00']);
	});
});

// ---------- the write path, through the real router ----------
const env = (db: D1Database, media: Partial<R2Bucket> = {}): Env =>
	({
		DB: db, ALLOWED_ORIGINS: 'https://anvesha26.in', ENVIRONMENT: 'test',
		MEDIA: { put: async () => ({}), get: async () => null, delete: async () => {}, ...media },
	}) as unknown as Env;

/** The handler takes an ExecutionContext; only waitUntil is ever called on it. */
const ctx = () => ({ waitUntil: () => {}, passThroughOnException: () => {} }) as unknown as ExecutionContext;

/** A live admin session for requireAdmin's single lookup. */
const signedIn = () => fakeDb([{ active: 1 }]);

const post = (body: unknown) =>
	new Request('https://api.test/api/events', {
		method: 'POST',
		headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});

const OK = {
	name: 'Robowars',
	starts_at: '2026-02-14 15:00',
	ends_at: '2026-02-14 18:00',
	venue: 'Arena, Ground 2',
	event_type: 'Competition',
};

describe('POST /api/events', () => {
	it('rejects a request with no session', async () => {
		const { db } = fakeDb([]);
		const res = await worker.fetch(
			new Request('https://api.test/api/events', { method: 'POST', body: '{}' }),
			env(db), ctx(),
		);
		assert.equal(res.status, 401);
	});

	it('accepts a well-formed event and mints an id', async () => {
		const { db } = signedIn();
		const res = await worker.fetch(post(OK), env(db), ctx());
		assert.equal(res.status, 201);
		assert.ok(looksLikeEventId((await res.json() as any).event_id));
	});

	it('takes the datetime-local shape an <input> sends', async () => {
		const { db } = signedIn();
		const res = await worker.fetch(post({ ...OK, starts_at: '2026-02-14T15:00' }), env(db), ctx());
		assert.equal(res.status, 201);
	});

	it('refuses an end before a start, and a date that does not exist', async () => {
		for (const patch of [
			{ ends_at: '2026-02-14 14:00' },
			{ starts_at: '2026-02-30 10:00' },
			{ starts_at: 'tomorrow' },
		]) {
			const { db } = signedIn();
			const res = await worker.fetch(post({ ...OK, ...patch }), env(db), ctx());
			assert.equal(res.status, 400, JSON.stringify(patch));
		}
	});

	it('refuses a javascript: registration link — that column ends up in an href', async () => {
		const { db } = signedIn();
		// eslint-disable-next-line no-script-url
		const res = await worker.fetch(post({ ...OK, registration_link: 'javascript:alert(1)' }), env(db), ctx());
		assert.equal(res.status, 400);
		assert.equal((await res.json() as any).error, 'bad_link');
	});

	it('stores a blank link as NULL rather than an empty string', async () => {
		const { db, seen } = signedIn();
		await worker.fetch(post({ ...OK, registration_link: '  ' }), env(db), ctx());
		const insert = seen.find((s) => /INSERT INTO events_scheduled/.test(s.sql));
		assert.ok(insert);
		assert.equal(insert.args[6], null);
	});
});

describe('GET /api/events', () => {
	it('hides a row the cron has not swept yet', async () => {
		const past = { event_id: 'EVT_00000000', ends_at: '2020-01-01 10:00' };
		const soon = { event_id: 'EVT_11111111', ends_at: '2099-01-01 10:00' };
		const { db } = fakeDb([past, soon]);
		const res = await worker.fetch(new Request('https://api.test/api/events'), env(db), ctx());
		const { events } = await res.json() as any;
		assert.deepEqual(events.map((e: any) => e.event_id), ['EVT_11111111']);
	});
});

describe('CORS', () => {
	it('echoes a listed origin and stays silent for anything else', async () => {
		const { db } = fakeDb([]);
		const call = (origin: string) =>
			worker.fetch(
				new Request('https://api.test/api/events', { method: 'OPTIONS', headers: { Origin: origin } }),
				env(db), ctx(),
			);
		assert.equal((await call('https://anvesha26.in')).headers.get('Access-Control-Allow-Origin'), 'https://anvesha26.in');
		assert.equal((await call('https://evil.example')).headers.get('Access-Control-Allow-Origin'), null);
	});
});
