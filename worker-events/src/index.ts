/**
 * Anvesha '26 events API — a Cloudflare Worker of its own.
 *
 *   GET    /api/events              upcoming, soonest first          [public]
 *   GET    /api/events/past         already happened, newest first   [public]
 *   POST   /api/events              add to the schedule              [admin]
 *   PUT    /api/events/:id          edit a scheduled event           [admin]
 *   DELETE /api/events/:id          drop a scheduled event           [admin]
 *   DELETE /api/events/past/:id     drop an archived event           [admin]
 *   PUT    /api/events/past/:id     add gallery link + summary       [admin]
 *   POST   /api/events/sweep        run the archive sweep now        [admin]
 *   GET    /api/events/:id/poster   poster image, streamed from R2   [public]
 *   POST   /api/events/:id/poster   upload/replace a poster          [admin]
 *   DELETE /api/events/:id/poster   remove a poster                  [admin]
 *   GET    /api/live                live updates socket              [public]
 *
 *   GET    /api/ideation           next ideation meetings           [public]
 *   GET    /api/ideation?all=1     including ones already held      [admin]
 *   POST   /api/ideation           schedule one                     [admin]
 *   PUT    /api/ideation/:id       move or rename one               [admin]
 *   DELETE /api/ideation/:id       drop one                         [admin]
 *
 * Separate deployment from the merch Worker, same D1 database. It shares nothing with
 * merch but the admin_login table — signing in on the existing admin panel has to let
 * you edit events too, and re-implementing a second login would mean a second password
 * to rotate and a second audit trail to read.
 *
 * The cron trigger (every 15 minutes, see wrangler.jsonc) is what moves an event from
 * events_scheduled to events_done once its end time has passed.
 */

// ============================================================
// env + small helpers
// ============================================================

export interface Env {
	DB: D1Database;
	// The merch bucket. Posters live under the `events/` prefix inside it.
	MEDIA: R2Bucket;
	HUB: DurableObjectNamespace<import('./hub.ts').EventsHub>;
	ALLOWED_ORIGINS: string;
	ENVIRONMENT: string;
}

type Cors = Record<string, string>;

/** An admin session is good for this long after login — matches the merch Worker. */
const SESSION_HOURS = 12;

/**
 * Everything in this table is naive IST, so "now" has to be built the same way before
 * it can be compared. Fixed +05:30 with no DST, which India does not observe.
 *
 * ponytail: a constant, not a timezone library. If this ever has to serve a fest in a
 * second timezone, that is the moment to reach for Intl.DateTimeFormat — not before.
 */
const IST_OFFSET_MIN = 330;

/** 'YYYY-MM-DD HH:MM' in IST for a given instant. */
export function istStamp(at: number = Date.now()): string {
	return new Date(at + IST_OFFSET_MIN * 60_000).toISOString().slice(0, 16).replace('T', ' ');
}

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford: no I, L, O, U
/**
 * A prefix + 40 bits of randomness. Public data, so it only has to be unique.
 *
 * The prefix is an argument with a default rather than a second copy of this function:
 * ideation meetings need their own ids and the alphabet, the bit-packing and the
 * length are not what differs between them.
 */
export function newEventId(prefix = 'EVT_'): string {
	const raw = crypto.getRandomValues(new Uint8Array(5));
	let bits = 0, value = 0, out = '';
	for (const byte of raw) {
		value = (value << 8) | byte;
		bits += 8;
		while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
	}
	return prefix + out;
}

export const looksLikeEventId = (v: unknown): v is string =>
	typeof v === 'string' && /^EVT_[0-9A-HJKMNP-TV-Z]{8}$/.test(v);

export const looksLikeMeetingId = (v: unknown): v is string =>
	typeof v === 'string' && /^IDE_[0-9A-HJKMNP-TV-Z]{8}$/.test(v);

class ApiError extends Error {
	status: number;
	code: string;
	constructor(status: number, code: string, message: string) {
		super(message);
		this.status = status;
		this.code = code;
	}
}
const bad = (code: string, message: string) => new ApiError(400, code, message);
const notFound = (m = 'Not found') => new ApiError(404, 'not_found', m);
const unauthorized = (m = 'Unauthorized') => new ApiError(401, 'unauthorized', m);

function corsHeaders(env: Env, req: Request): Cors {
	const origin = req.headers.get('Origin') ?? '';
	const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
	const base: Cors = {
		'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type,Authorization',
		'Access-Control-Max-Age': '86400',
		Vary: 'Origin',
	};
	// Never '*' and never a reflected stranger: the admin routes carry an
	// Authorization header, so an unlisted origin gets no Allow-Origin header at all.
	if (!allowed.includes(origin)) return base;
	return { ...base, 'Access-Control-Allow-Origin': origin };
}

const json = (data: unknown, init: ResponseInit = {}, cors: Cors = {}) =>
	new Response(JSON.stringify(data), {
		...init,
		headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors, ...(init.headers ?? {}) },
	});

async function readJson<T>(req: Request, maxBytes = 16_384): Promise<T> {
	const text = await req.text();
	if (text.length > maxBytes) throw bad('payload_too_large', 'Request body too large');
	try {
		return JSON.parse(text) as T;
	} catch {
		throw bad('invalid_json', 'Body is not valid JSON');
	}
}

// ============================================================
// auth — the merch Worker's session, read from the shared D1
// ============================================================

/** The signed-in admin, for rows that record who did something. */
export interface AdminIdentity {
	name: string;
	roll_number: string;
	collegemail: string;
}

/**
 * Throws 401 unless the Bearer token is a live admin session; returns who it belongs to.
 *
 * The identity comes back from the query that was already being run — callers that do
 * not need it simply ignore the return, which is every caller that existed before the
 * ideation table needed to record an author.
 */
async function requireAdmin(env: Env, req: Request): Promise<AdminIdentity> {
	const header = req.headers.get('Authorization') ?? '';
	const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
	if (!token) throw unauthorized('Not signed in');

	// login_validation is a single fixed row and is read on every request, not cached,
	// so flipping `active` to 0 locks out sessions that are already open. Expiry lives
	// in the WHERE clause — an aged-out session simply stops matching.
	const row = await env.DB.prepare(
		`SELECT v.active, a.name, a.roll_number, a.collegemail
		   FROM admin_login a, login_validation v
		  WHERE a.session_token = ?
		    AND a.logout_time IS NULL
		    AND a.login_time > datetime('now', ?)
		    AND v.id = 1`,
	)
		.bind(token, `-${SESSION_HOURS} hours`)
		.first<{ active: number } & AdminIdentity>();

	if (!row) throw unauthorized('Session expired — sign in again');
	if (row.active !== 1) throw new ApiError(403, 'admin_disabled', 'Admin access is switched off');
	return { name: row.name, roll_number: row.roll_number, collegemail: row.collegemail };
}

// ============================================================
// validation
// ============================================================

const STAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

function str(v: unknown, field: string, max: number, required = true): string {
	const s = typeof v === 'string' ? v.trim() : '';
	if (!s) {
		if (required) throw bad('missing_field', `${field} is required`);
		return '';
	}
	if (s.length > max) throw bad('field_too_long', `${field} is too long (max ${max})`);
	return s;
}

/** Accepts 'YYYY-MM-DD HH:MM' and also the 'YYYY-MM-DDTHH:MM' an <input type="datetime-local"> sends. */
function stamp(v: unknown, field: string): string {
	const s = typeof v === 'string' ? v.trim().replace('T', ' ').slice(0, 16) : '';
	if (!STAMP.test(s)) throw bad('bad_datetime', `${field} must look like 2026-02-14 10:00`);
	// Regex shape is not calendar validity — 2026-02-31 matches it and 2026-02-30 does not exist.
	const [d, t] = s.split(' ');
	const iso = new Date(`${d}T${t}:00Z`);
	if (Number.isNaN(iso.getTime()) || iso.toISOString().slice(0, 10) !== d) {
		throw bad('bad_datetime', `${field} is not a real date`);
	}
	return s;
}

/**
 * A link goes straight into an href on the page, so the scheme is the trust boundary:
 * `javascript:...` in this column is stored XSS on the events page. http/https only.
 * Empty means "no link" and is stored as NULL, never as ''.
 */
function link(v: unknown, field: string): string | null {
	const s = typeof v === 'string' ? v.trim() : '';
	if (!s) return null;
	if (s.length > 500) throw bad('field_too_long', `${field} is too long (max 500)`);
	let u: URL;
	try {
		u = new URL(s);
	} catch {
		throw bad('bad_link', `${field} must be a full URL starting with https://`);
	}
	if (u.protocol !== 'https:' && u.protocol !== 'http:') {
		throw bad('bad_link', `${field} must be an http(s) URL`);
	}
	return s;
}

interface EventBody {
	name?: unknown; starts_at?: unknown; ends_at?: unknown; venue?: unknown;
	description?: unknown; registration_link?: unknown; event_type?: unknown;
}

/** Everything the scheduled table needs, validated. Shared by create and update. */
function parseEvent(body: EventBody) {
	const starts_at = stamp(body.starts_at, 'starts_at');
	const ends_at = stamp(body.ends_at, 'ends_at');
	if (ends_at <= starts_at) throw bad('bad_datetime', 'ends_at must be after starts_at');
	return {
		name: str(body.name, 'name', 160),
		starts_at,
		ends_at,
		venue: str(body.venue, 'venue', 160),
		description: str(body.description, 'description', 4000, false),
		registration_link: link(body.registration_link, 'registration_link'),
		event_type: str(body.event_type, 'event_type', 40, false) || 'Event',
	};
}

// ============================================================
// live updates
// ============================================================

/**
 * Tells every connected browser that something moved.
 *
 * Fire-and-forget on purpose: the write it follows is already committed, so a hub that
 * is unreachable must cost the caller nothing but a log line. `reason` lets a listener
 * decide whether it cares — the storefront refetches for anything, the admin panel
 * ignores its own saves because it already has the answer.
 */
async function broadcast(env: Env, reason: string, type = 'events'): Promise<void> {
	try {
		// One well-known name = one object = every viewer on the same fan-out point.
		// `type` so the expo page can listen for ideation changes without refetching the
		// whole schedule every time an event is edited, and vice versa.
		const hub = env.HUB.get(env.HUB.idFromName('events'));
		await hub.broadcast(JSON.stringify({ type, reason, at: Date.now() }));
	} catch (e) {
		console.error('events: broadcast failed', e);
	}
}

// ============================================================
// posters
// ============================================================

/** Only formats every browser and R2 will serve back without transcoding. */
const IMAGE_TYPES: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/avif': 'avif',
};
const MAX_POSTER_BYTES = 6 * 1024 * 1024;

/** Which table holds this id, and what its poster key is. One round trip, not two. */
async function findEvent(env: Env, id: string) {
	const row = await env.DB.prepare(
		`SELECT 'scheduled' AS tbl, poster_path FROM events_scheduled WHERE event_id = ?
		 UNION ALL
		 SELECT 'done' AS tbl, poster_path FROM events_done WHERE event_id = ?`,
	)
		.bind(id, id)
		.first<{ tbl: 'scheduled' | 'done'; poster_path: string | null }>();
	return row;
}
const tableOf = (tbl: 'scheduled' | 'done') => (tbl === 'scheduled' ? 'events_scheduled' : 'events_done');

/**
 * The poster is served through the Worker rather than from a public bucket URL so it
 * carries this Worker's CORS and cache headers — and so replacing one does not require
 * anything that references it to learn a new address.
 */
async function getPoster(env: Env, id: string, cors: Cors, req: Request, ctx?: ExecutionContext) {
	if (!looksLikeEventId(id)) throw notFound('No such event');

	const cache = caches.default;
	const cacheKey = new Request(new URL(req.url).toString(), { method: 'GET' });
	const hit = await cache.match(cacheKey);
	if (hit) {
		// CORS is per-origin and must not come out of a shared cache, so the live headers
		// are merged back over whatever the stored copy carries.
		const headers = new Headers(hit.headers);
		for (const [k, v] of Object.entries(cors)) headers.set(k, v);
		return new Response(hit.body, { headers, status: hit.status });
	}

	const row = await findEvent(env, id);
	if (!row) throw notFound('No such event');
	if (!row.poster_path) throw notFound('No poster for this event');

	const object = await env.MEDIA.get(row.poster_path);
	if (!object) throw notFound('Poster missing from storage');

	const headers = new Headers(cors);
	object.writeHttpMetadata(headers); // Content-Type as uploaded
	headers.set('etag', object.httpEtag);
	headers.set('Cache-Control', 'public, max-age=86400');

	const res = new Response(object.body, { headers });
	// clone(), not arrayBuffer(): the body stays a stream, so bytes start arriving
	// immediately instead of after the whole image has buffered.
	if (ctx) ctx.waitUntil(cache.put(cacheKey, res.clone()));
	return res;
}

/** The edge cache is keyed by URL and the URL never changes, so a replaced poster would
 *  keep serving the old bytes for a day. Dropped on every write. */
async function purgePoster(req: Request, id: string) {
	try {
		const { origin } = new URL(req.url);
		await caches.default.delete(`${origin}/api/events/${encodeURIComponent(id)}/poster`);
	} catch (e) {
		// A stale image is not worth failing an upload that already committed.
		console.error('events: poster purge failed', e);
	}
}

async function putPoster(env: Env, req: Request, id: string, cors: Cors): Promise<Response> {
	await requireAdmin(env, req);
	if (!looksLikeEventId(id)) throw notFound('No such event');

	const row = await findEvent(env, id);
	if (!row) throw notFound('No such event');

	const form = await req.formData().catch(() => null);
	if (!form) throw bad('bad_body', 'Expected multipart form data');
	const file = form.get('poster');
	if (!(file instanceof File) || file.size === 0) throw bad('no_file', 'No poster in the request');

	const ext = IMAGE_TYPES[file.type];
	if (!ext) throw bad('bad_image_type', `Unsupported image type ${file.type || 'unknown'}`);
	if (file.size > MAX_POSTER_BYTES) throw bad('image_too_large', 'The poster must be 6MB or smaller');

	// Keyed by id AND extension, so replacing a PNG with a JPEG writes a new object
	// rather than leaving a .png key holding JPEG bytes. The old one is deleted after
	// the row is updated — losing the delete costs storage; losing the update would
	// leave the row pointing at nothing.
	const key = `events/${id}.${ext}`;
	await env.MEDIA.put(key, file.stream(), {
		httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=86400' },
	});
	await env.DB.prepare(`UPDATE ${tableOf(row.tbl)} SET poster_path = ? WHERE event_id = ?`)
		.bind(key, id)
		.run();
	if (row.poster_path && row.poster_path !== key) await env.MEDIA.delete(row.poster_path);
	await purgePoster(req, id);
	await broadcast(env, 'poster');

	return json({ event_id: id, has_poster: true }, {}, cors);
}

async function deletePoster(env: Env, req: Request, id: string, cors: Cors): Promise<Response> {
	await requireAdmin(env, req);
	if (!looksLikeEventId(id)) throw notFound('No such event');

	const row = await findEvent(env, id);
	if (!row) throw notFound('No such event');

	await env.DB.prepare(`UPDATE ${tableOf(row.tbl)} SET poster_path = NULL WHERE event_id = ?`)
		.bind(id)
		.run();
	if (row.poster_path) await env.MEDIA.delete(row.poster_path);
	await purgePoster(req, id);
	await broadcast(env, 'poster');

	return json({ event_id: id, has_poster: false }, {}, cors);
}

// ============================================================
// the sweep — scheduled -> done, once the end time has passed
// ============================================================

/**
 * Moves every event whose end time is in the past into events_done.
 *
 * One batch, which D1 runs as a single transaction: without that the DELETE could land
 * after a failed INSERT and take the events with it. INSERT OR IGNORE covers the row
 * that is somehow already in events_done — the DELETE then finishes the job that was
 * half-done, rather than the whole sweep failing on one duplicate id.
 *
 * Idempotent by construction, so running it twice, or by hand, costs nothing.
 */
export async function sweep(env: Env, now = istStamp()): Promise<number> {
	const [moved] = await env.DB.batch([
		env.DB.prepare(
			`INSERT OR IGNORE INTO events_done
			   (event_id, name, starts_at, ends_at, venue, description, event_type, poster_path)
			 SELECT event_id, name, starts_at, ends_at, venue, description, event_type, poster_path
			   FROM events_scheduled WHERE ends_at <= ?`,
		).bind(now),
		env.DB.prepare(`DELETE FROM events_scheduled WHERE ends_at <= ?`).bind(now),
	]);
	return moved.meta.changes ?? 0;
}

// ============================================================
// routes
// ============================================================

async function listScheduled(env: Env, cors: Cors): Promise<Response> {
	// has_poster, not poster_path: the R2 key is storage detail the page has no use for,
	// and the image is fetched from /poster regardless of what it is stored as.
	const { results } = await env.DB.prepare(
		`SELECT event_id, name, starts_at, ends_at, venue, description, registration_link, event_type,
		        poster_path IS NOT NULL AS has_poster
		   FROM events_scheduled ORDER BY starts_at ASC`,
	).all();
	// A row whose end time has passed but that the cron has not reached yet would
	// otherwise show as upcoming for up to 15 minutes. Filtering here rather than
	// shortening the cron keeps the page honest at zero extra cost.
	const now = istStamp();
	return json({ events: results.filter((r: any) => r.ends_at > now) }, {}, cors);
}

async function listDone(env: Env, cors: Cors): Promise<Response> {
	// Two sources, not one. listScheduled drops an event the moment its end time passes,
	// but the row only reaches events_done on the next cron tick — so for up to fifteen
	// minutes it was in NEITHER list and simply disappeared off the site. The union makes
	// the sweep pure bookkeeping: what a visitor sees is decided by the clock, not by
	// when the cron last ran.
	//
	// gallery_link and summary are NULL for the not-yet-moved rows because they are
	// columns events_scheduled does not have — which is exactly right, since nobody can
	// have written up an event that finished four minutes ago.
	const { results } = await env.DB.prepare(
		`SELECT event_id, name, starts_at, ends_at, venue, description, gallery_link, summary, event_type,
		        poster_path IS NOT NULL AS has_poster
		   FROM events_done
		 UNION ALL
		 SELECT event_id, name, starts_at, ends_at, venue, description, NULL, NULL, event_type,
		        poster_path IS NOT NULL
		   FROM events_scheduled WHERE ends_at <= ?
		 ORDER BY ends_at DESC`,
	)
		.bind(istStamp())
		.all();
	return json({ events: results }, {}, cors);
}

async function createEvent(env: Env, req: Request, cors: Cors): Promise<Response> {
	await requireAdmin(env, req);
	const e = parseEvent(await readJson<EventBody>(req));
	const event_id = newEventId();
	await env.DB.prepare(
		`INSERT INTO events_scheduled
		   (event_id, name, starts_at, ends_at, venue, description, registration_link, event_type)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
	)
		.bind(event_id, e.name, e.starts_at, e.ends_at, e.venue, e.description, e.registration_link, e.event_type)
		.run();
	await broadcast(env, 'created');
	return json({ event_id, ...e }, { status: 201 }, cors);
}

async function updateEvent(env: Env, req: Request, id: string, cors: Cors): Promise<Response> {
	await requireAdmin(env, req);
	if (!looksLikeEventId(id)) throw notFound('No such event');
	const e = parseEvent(await readJson<EventBody>(req));
	const res = await env.DB.prepare(
		`UPDATE events_scheduled
		    SET name = ?, starts_at = ?, ends_at = ?, venue = ?, description = ?,
		        registration_link = ?, event_type = ?
		  WHERE event_id = ?`,
	)
		.bind(e.name, e.starts_at, e.ends_at, e.venue, e.description, e.registration_link, e.event_type, id)
		.run();
	if (!res.meta.changes) throw notFound('No such event');
	await broadcast(env, 'updated');
	return json({ event_id: id, ...e }, {}, cors);
}

async function deleteEvent(env: Env, req: Request, id: string, cors: Cors): Promise<Response> {
	await requireAdmin(env, req);
	if (!looksLikeEventId(id)) throw notFound('No such event');
	// Read the key before the row goes: afterwards there is nothing left to say which
	// object belonged to it, and an orphan in R2 costs storage forever.
	const row = await findEvent(env, id);
	const res = await env.DB.prepare(`DELETE FROM events_scheduled WHERE event_id = ?`).bind(id).run();
	if (!res.meta.changes) throw notFound('No such event');
	if (row?.poster_path) {
		await env.MEDIA.delete(row.poster_path).catch((e) => console.error('events: poster delete failed', e));
		await purgePoster(req, id);
	}
	await broadcast(env, 'deleted');
	return json({ ok: true }, {}, cors);
}

/**
 * The only two fields a past event has that a scheduled one does not. Everything else
 * about it is history and is deliberately not editable here — if a name or a venue was
 * wrong, it was wrong on the day.
 */
async function updateDone(env: Env, req: Request, id: string, cors: Cors): Promise<Response> {
	await requireAdmin(env, req);
	if (!looksLikeEventId(id)) throw notFound('No such event');
	const body = await readJson<{ gallery_link?: unknown; summary?: unknown }>(req);
	const gallery_link = link(body.gallery_link, 'gallery_link');
	const summary = str(body.summary, 'summary', 4000, false) || null;

	// The archive now lists events that have ended but not yet been moved, so an admin
	// can open one before the cron has run. Sweeping first — it is idempotent and cheap —
	// is what stops that write 404ing on a row that is still in the other table.
	const where = await findEvent(env, id);
	if (where?.tbl === 'scheduled') await sweep(env);

	const res = await env.DB.prepare(
		`UPDATE events_done SET gallery_link = ?, summary = ? WHERE event_id = ?`,
	)
		.bind(gallery_link, summary, id)
		.run();
	if (!res.meta.changes) throw notFound('No such event');
	await broadcast(env, 'updated');
	return json({ event_id: id, gallery_link, summary }, {}, cors);
}

/**
 * Drops an archived event and its poster.
 *
 * A separate route from deleteEvent rather than one that guesses the table: the two
 * delete different things — this one destroys history — and a mistyped id should 404
 * rather than quietly remove whichever row happens to match in the other table.
 *
 * The sweep is the same guard updateDone needs. The archive lists events that have ended
 * but not yet been moved by the cron, so an admin can be looking at a row that is still
 * physically in events_scheduled; without sweeping first this would 404 on a row the
 * caller can plainly see.
 */
async function deleteDone(env: Env, req: Request, id: string, cors: Cors): Promise<Response> {
	await requireAdmin(env, req);
	if (!looksLikeEventId(id)) throw notFound('No such event');

	const where = await findEvent(env, id);
	if (where?.tbl === 'scheduled') await sweep(env);

	// Read the poster key before the row goes — afterwards nothing says which object
	// belonged to it, and an orphan in R2 costs storage forever.
	const row = await findEvent(env, id);
	const res = await env.DB.prepare(`DELETE FROM events_done WHERE event_id = ?`).bind(id).run();
	if (!res.meta.changes) throw notFound('No such event');

	if (row?.poster_path) {
		await env.MEDIA.delete(row.poster_path).catch((e) =>
			console.error('events: poster delete failed', e));
		await purgePoster(req, id);
	}

	await broadcast(env, 'deleted');
	return json({ ok: true }, {}, cors);
}

// ============================================================
// entry points
// ============================================================
// ideation meetings
// ============================================================

/**
 * How long after it starts a meeting still counts as "next".
 *
 * These rows have no end time, so without a grace window the section on the expo page
 * would go blank at the exact moment people were walking into the room. Two hours is
 * longer than any of these has ever run and short enough that yesterday's meeting is
 * never the one being advertised.
 */
const MEETING_GRACE_MIN = 120;

interface MeetingBody { subject?: unknown; starts_at?: unknown; venue?: unknown }

function parseMeeting(body: MeetingBody) {
	return {
		subject: str(body.subject, 'subject', 200),
		starts_at: stamp(body.starts_at, 'starts_at'),
		venue: str(body.venue, 'venue', 160),
	};
}

/**
 * Upcoming by default; everything ever with ?all=1, which needs an admin.
 *
 * One route rather than two: the difference is a WHERE clause and who is allowed to
 * drop it, and a second path would have duplicated the SELECT to say so.
 */
async function listIdeation(env: Env, req: Request, cors: Cors, all: boolean): Promise<Response> {
	if (all) await requireAdmin(env, req);
	const cols = `meeting_id, subject, starts_at, venue,
	              created_by_name, created_by_roll, created_at,
	              updated_by_name, updated_by_roll, updated_at`;
	const stmt = all
		? env.DB.prepare(`SELECT ${cols} FROM ideation_meetings ORDER BY starts_at DESC`)
		: env.DB.prepare(`SELECT ${cols} FROM ideation_meetings WHERE starts_at > ? ORDER BY starts_at ASC`)
			.bind(istStamp(Date.now() - MEETING_GRACE_MIN * 60_000));
	const { results } = await stmt.all();
	return json({ meetings: results }, {}, cors);
}

async function createMeeting(env: Env, req: Request, cors: Cors): Promise<Response> {
	const who = await requireAdmin(env, req);
	const m = parseMeeting(await readJson<MeetingBody>(req));
	const meeting_id = newEventId('IDE_');
	await env.DB.prepare(
		`INSERT INTO ideation_meetings
		   (meeting_id, subject, starts_at, venue, created_by_name, created_by_roll, created_by_email)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
	)
		.bind(meeting_id, m.subject, m.starts_at, m.venue, who.name, who.roll_number, who.collegemail)
		.run();
	await broadcast(env, 'created', 'ideation');
	return json({ meeting_id, ...m, created_by_name: who.name, created_by_roll: who.roll_number }, { status: 201 }, cors);
}

async function updateMeeting(env: Env, req: Request, id: string, cors: Cors): Promise<Response> {
	const who = await requireAdmin(env, req);
	if (!looksLikeMeetingId(id)) throw notFound('No such meeting');
	const m = parseMeeting(await readJson<MeetingBody>(req));
	// created_by_* is deliberately untouched: it says who called the meeting, and an
	// edit by someone else is a different fact, which is what updated_by_* is for.
	const res = await env.DB.prepare(
		`UPDATE ideation_meetings
		    SET subject = ?, starts_at = ?, venue = ?,
		        updated_by_name = ?, updated_by_roll = ?, updated_at = datetime('now')
		  WHERE meeting_id = ?`,
	)
		.bind(m.subject, m.starts_at, m.venue, who.name, who.roll_number, id)
		.run();
	if (!res.meta.changes) throw notFound('No such meeting');
	await broadcast(env, 'updated', 'ideation');
	return json({ meeting_id: id, ...m }, {}, cors);
}

async function deleteMeeting(env: Env, req: Request, id: string, cors: Cors): Promise<Response> {
	await requireAdmin(env, req);
	if (!looksLikeMeetingId(id)) throw notFound('No such meeting');
	const res = await env.DB.prepare(`DELETE FROM ideation_meetings WHERE meeting_id = ?`).bind(id).run();
	if (!res.meta.changes) throw notFound('No such meeting');
	await broadcast(env, 'deleted', 'ideation');
	return json({ ok: true }, {}, cors);
}

// ============================================================

// The Durable Object class must be exported from the entry point for the runtime to
// find it — the binding in wrangler.jsonc only names it.
export { EventsHub } from './hub.ts';

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const cors = corsHeaders(env, req);
		if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

		const url = new URL(req.url);
		const { pathname } = url;
		const method = req.method;

		try {
			if (method === 'GET' && pathname === '/api/events') return await listScheduled(env, cors);
			if (method === 'GET' && pathname === '/api/events/past') return await listDone(env, cors);
			if (method === 'POST' && pathname === '/api/events') return await createEvent(env, req, cors);
			if (method === 'POST' && pathname === '/api/events/sweep') {
				await requireAdmin(env, req);
				const moved = await sweep(env);
				if (moved) await broadcast(env, 'archived');
				return json({ moved }, {}, cors);
			}

			if (method === 'GET' && pathname === '/api/ideation') {
				return await listIdeation(env, req, cors, url.searchParams.get('all') === '1');
			}
			if (method === 'POST' && pathname === '/api/ideation') return await createMeeting(env, req, cors);

			const meeting = pathname.match(/^\/api\/ideation\/([^/]+)$/);
			if (meeting) {
				const id = decodeURIComponent(meeting[1]);
				if (method === 'PUT') return await updateMeeting(env, req, id, cors);
				if (method === 'DELETE') return await deleteMeeting(env, req, id, cors);
			}

			// The socket itself. No CORS headers: a WebSocket upgrade is not a CORS
			// request, and the browser never applies the check to one.
			if (method === 'GET' && pathname === '/api/live') {
				return await env.HUB.get(env.HUB.idFromName('events')).fetch(req);
			}

			const poster = pathname.match(/^\/api\/events\/([^/]+)\/poster$/);
			if (poster) {
				const id = decodeURIComponent(poster[1]);
				if (method === 'GET') return await getPoster(env, id, cors, req, ctx);
				if (method === 'POST') return await putPoster(env, req, id, cors);
				if (method === 'DELETE') return await deletePoster(env, req, id, cors);
			}

			// /past/:id before /:id — otherwise 'past' is read as an event id.
			const past = pathname.match(/^\/api\/events\/past\/([^/]+)$/);
			if (past) {
				const id = decodeURIComponent(past[1]);
				if (method === 'PUT') return await updateDone(env, req, id, cors);
				if (method === 'DELETE') return await deleteDone(env, req, id, cors);
			}

			const one = pathname.match(/^\/api\/events\/([^/]+)$/);
			if (one) {
				const id = decodeURIComponent(one[1]);
				if (method === 'PUT') return await updateEvent(env, req, id, cors);
				if (method === 'DELETE') return await deleteEvent(env, req, id, cors);
			}

			return json({ error: 'not_found', message: 'Unknown route' }, { status: 404 }, cors);
		} catch (err) {
			if (err instanceof ApiError) {
				return json({ error: err.code, message: err.message }, { status: err.status }, cors);
			}
			console.error('events: unhandled', err);
			return json({ error: 'server_error', message: 'Something went wrong' }, { status: 500 }, cors);
		}
	},

	/** Cron trigger. The whole reason two tables can stay in sync without anyone looking. */
	async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
		ctx.waitUntil(
			sweep(env)
				.then(async (n) => {
					if (!n) return;
					console.log(`events: archived ${n}`);
					// The whole point of the socket. This is the one change nobody triggered
					// and nobody is watching for — a page open since this morning would
					// otherwise keep an ended event under Upcoming until it was reloaded.
					await broadcast(env, 'archived');
				})
				.catch((e) => console.error('events: sweep failed', e)),
		);
	},
};
