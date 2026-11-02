/**
 * The three things here that can be silently wrong: the IST clock the sweep compares
 * against, the link validator standing between an admin's paste and an href on the
 * page, and the sweep's own boundary.
 *
 *   npm test        (node --test, using Node's native TS type stripping)
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import worker, {
	type Env, istStamp, looksLikeEventId, newEventId, parseProject, projectImageKey, sweep,
} from '../src/index.ts';

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
	it('takes a prefix, and the event matcher refuses any other', () => {
		assert.equal(looksLikeEventId(newEventId('PRJ_')), false);
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

/**
 * A live admin session for requireAdmin's single lookup.
 *
 * The identity columns are here because requireAdmin returns them now and project
 * rows are stamped with them — a stub that only had `active` would have let a bug that
 * writes `undefined` into created_by_name pass.
 */
const signedIn = () => fakeDb([
	{ active: 1, name: 'Asha R', roll_number: 'IMS21001', collegemail: 'asha@iisertvm.ac.in' },
]);

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

describe('GET /api/events/past', () => {
	it('reads both tables, so an ended event is never in neither list', async () => {
		const { db, seen } = fakeDb([]);
		await worker.fetch(new Request('https://api.test/api/events/past'), env(db), ctx());
		const q = seen.find((s) => /FROM events_done/.test(s.sql))!;
		assert.ok(q, 'the archive query should run');
		// The union is the whole fix: without the second branch a row that has ended but
		// not yet been swept is dropped from Upcoming and absent from the archive.
		assert.match(q.sql, /UNION ALL/);
		assert.match(q.sql, /FROM events_scheduled WHERE ends_at <= \?/);
		assert.equal(q.args.length, 1, 'bound to one IST cutoff');
		assert.match(String(q.args[0]), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
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

// ---------- expo projects ----------

/**
 * A D1 stub that answers by SQL: each query is matched against `script` in order and
 * gets the first row list whose pattern fits. Unlike fakeDb, a create can be signed in,
 * read an old row and get a RETURNING row back, all in one request.
 */
function scriptedDb(script: [RegExp, any[]][]) {
	const seen: { sql: string; args: unknown[] }[] = [];
	const rowsFor = (sql: string) => script.find(([re]) => re.test(sql))?.[1] ?? [];
	const stmt = (sql: string, args: unknown[] = []): any => ({
		bind: (...a: unknown[]) => stmt(sql, a),
		run: async () => (seen.push({ sql, args }), { meta: { changes: rowsFor(sql).length } }),
		all: async () => (seen.push({ sql, args }), { results: rowsFor(sql) }),
		first: async () => (seen.push({ sql, args }), rowsFor(sql)[0] ?? null),
	});
	return { seen, db: { prepare: (sql: string) => stmt(sql) } as unknown as D1Database };
}

const ADMIN: [RegExp, any[]] = [/FROM admin_login/, [
	{ active: 1, name: 'Asha R', roll_number: 'IMS21001', collegemail: 'asha@iisertvm.ac.in' },
]];

/** An R2 stub that remembers what was written and deleted. */
function fakeBucket(existing: Record<string, string> = {}) {
	const puts: string[] = [], deletes: string[] = [];
	return {
		puts, deletes,
		media: {
			put: async (k: string) => { puts.push(k); return {}; },
			get: async (k: string) => (k in existing
				? { body: existing[k], httpMetadata: { contentType: 'image/png' } } : null),
			delete: async (k: string) => { deletes.push(k); },
		} as unknown as R2Bucket,
	};
}

function projectForm(patch: Record<string, string | string[] | File> = {}) {
	const f = new FormData();
	const fields = { subject: 'PHY', title: 'Cloud chamber', description: 'Watch muons go by.', team: ['Asha R', 'Vivek M'], ...patch };
	for (const [k, v] of Object.entries(fields)) {
		for (const one of Array.isArray(v) ? v : [v]) f.append(k, one);
	}
	return f;
}

const sendForm = (method: string, path: string, body?: FormData, auth = true) =>
	new Request('https://api.test' + path, {
		method, ...(body ? { body } : {}),
		...(auth ? { headers: { Authorization: 'Bearer tok' } } : {}),
	});

const png = () => new File(['x'], 'p.png', { type: 'image/png' });

describe('parseProject', () => {
	it('takes the subject code in any case and drops blank team rows', () => {
		const p = parseProject(projectForm({ subject: 'bio', team: ['Asha R', '  ', 'Vivek M'] }));
		assert.equal(p.subject, 'BIO');
		assert.deepEqual(p.team, ['Asha R', 'Vivek M']);
	});

	it('refuses a subject that is not one of the six, and a team with nobody in it', () => {
		assert.throws(() => parseProject(projectForm({ subject: 'ART' })), /subject/i);
		assert.throws(() => parseProject(projectForm({ team: ['', ' '] })), /team member/i);
	});
});

describe('projectImageKey', () => {
	it('names the photo after the exhibit, under projects/', () => {
		assert.equal(projectImageKey('BIO', 3, 'jpg'), 'projects/BIO_03.jpg');
		assert.equal(projectImageKey('EES', 12, 'webp'), 'projects/EES_12.webp');
	});
});

describe('POST /api/projects', () => {
	it('needs a session', async () => {
		const { db } = scriptedDb([]);
		const res = await worker.fetch(sendForm('POST', '/api/projects', projectForm(), false), env(db), ctx());
		assert.equal(res.status, 401);
	});

	it('numbers it inside the INSERT and files the photo under that number', async () => {
		const { db, seen } = scriptedDb([ADMIN, [/INSERT INTO projects/, [{ project_id: 7, project_no: 4 }]]]);
		const bucket = fakeBucket();
		const res = await worker.fetch(
			sendForm('POST', '/api/projects', projectForm({ image: png() })), env(db, bucket.media), ctx(),
		);
		assert.equal(res.status, 201);

		const insert = seen.find((q) => /INSERT INTO projects/.test(q.sql))!;
		// Read-then-write would let two admins both claim the same number.
		assert.match(insert.sql, /COALESCE\(MAX\(project_no\), 0\) \+ 1/);
		assert.deepEqual(JSON.parse(String(insert.args[3])), ['Asha R', 'Vivek M']);

		assert.deepEqual(bucket.puts, ['projects/PHY_04.png']);
		const update = seen.find((q) => /UPDATE projects SET image_path/.test(q.sql))!;
		assert.deepEqual(update.args, ['projects/PHY_04.png', 7]);
	});

	it('refuses a bad photo before writing a row', async () => {
		const { db, seen } = scriptedDb([ADMIN]);
		const svg = new File(['x'], 'p.svg', { type: 'image/svg+xml' });
		const res = await worker.fetch(sendForm('POST', '/api/projects', projectForm({ image: svg })), env(db), ctx());
		assert.equal(res.status, 400);
		assert.equal((await res.json() as any).error, 'bad_image_type');
		assert.ok(!seen.some((q) => /INSERT INTO projects/.test(q.sql)), 'no row for a refused photo');
	});
});

describe('PUT /api/projects/:id', () => {
	it('moving subject renames the photo to the new code, then drops the old one', async () => {
		const { db, seen } = scriptedDb([
			ADMIN,
			[/SELECT subject, project_no, image_path FROM projects/, [{ subject: 'BIO', project_no: 3, image_path: 'projects/BIO_03.png' }]],
			[/UPDATE projects\s+SET project_no/, [{ project_no: 5 }]],
		]);
		const bucket = fakeBucket({ 'projects/BIO_03.png': 'bytes' });
		const res = await worker.fetch(sendForm('PUT', '/api/projects/9', projectForm()), env(db, bucket.media), ctx());
		assert.equal(res.status, 200);
		assert.deepEqual(bucket.puts, ['projects/PHY_05.png']);
		assert.deepEqual(bucket.deletes, ['projects/BIO_03.png']);
		const update = seen.find((q) => /UPDATE projects SET image_path/.test(q.sql))!;
		assert.deepEqual(update.args, ['projects/PHY_05.png', 9]);
	});

	it('remove_image clears the column and the object', async () => {
		const { db, seen } = scriptedDb([
			ADMIN,
			[/SELECT subject, project_no, image_path FROM projects/, [{ subject: 'PHY', project_no: 2, image_path: 'projects/PHY_02.jpg' }]],
			[/UPDATE projects\s+SET project_no/, [{ project_no: 2 }]],
		]);
		const bucket = fakeBucket();
		const res = await worker.fetch(
			sendForm('PUT', '/api/projects/9', projectForm({ remove_image: '1' })), env(db, bucket.media), ctx(),
		);
		assert.equal(res.status, 200);
		assert.deepEqual(bucket.deletes, ['projects/PHY_02.jpg']);
		assert.deepEqual(seen.find((q) => /UPDATE projects SET image_path/.test(q.sql))!.args, [null, 9]);
	});

	it('404s a project that does not exist', async () => {
		const { db } = scriptedDb([ADMIN]);
		const res = await worker.fetch(sendForm('PUT', '/api/projects/404', projectForm()), env(db), ctx());
		assert.equal(res.status, 404);
	});
});

describe('DELETE /api/projects/:id', () => {
	it('takes the photo with it', async () => {
		const { db } = scriptedDb([ADMIN, [/DELETE FROM projects/, [{ image_path: 'projects/MAT_01.jpg' }]]]);
		const bucket = fakeBucket();
		const res = await worker.fetch(sendForm('DELETE', '/api/projects/3'), env(db, bucket.media), ctx());
		assert.equal(res.status, 200);
		assert.deepEqual(bucket.deletes, ['projects/MAT_01.jpg']);
	});
});

describe('GET /api/projects', () => {
	it('is public, in floor order, with the team unpacked into an array', async () => {
		const { db, seen } = scriptedDb([[/FROM projects ORDER BY/, [
			{ project_id: 1, subject: 'BIO', project_no: 1, title: 't', description: 'd', team: '["A","B"]', has_image: 1, v: 'x' },
		]]]);
		const res = await worker.fetch(sendForm('GET', '/api/projects', undefined, false), env(db), ctx());
		assert.equal(res.status, 200);
		const { projects } = await res.json() as any;
		assert.deepEqual(projects[0].team, ['A', 'B']);
		assert.equal(projects[0].has_image, true);
		assert.match(seen[0].sql, /ORDER BY subject, project_no/);
	});
});
