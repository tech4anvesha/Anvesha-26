/**
 * Spot sales — the stall's pass.
 *
 * The storefront is shut to the internet (both merch_release switches off). A volunteer
 * at the stall taps PLACE ORDER, the screen draws a QR for /spot/<pass>, and the student
 * scans it off that screen. There is nothing to remember, nothing worth sharing and
 * nothing that works twice.
 *
 * Three rules shape the table:
 *
 *   1. One pass, one order. `used_at` is set when the order is submitted, and a used
 *      pass opens nothing — so a link forwarded to a friend across campus is already
 *      dead by the time the person at the stall walks away.
 *   2. A pass is claimed on first open, NOT on submit. Filling in details, paying by UPI
 *      and photographing the receipt takes two to four minutes; if the stall screen
 *      stayed locked for that long the queue would move at one student every three
 *      minutes. The screen frees up as soon as the phone opens the link.
 *   3. A pass expires. Someone scans, wanders off, and the pass must not still be good
 *      an hour later. PASS_MINUTES is the whole window.
 *
 * `requireSpotPass` is read on every catalogue, checkout and submit that carries a pass,
 * never trusted once at claim — revoking has to be immediate, same as a distribution
 * session's `end_time IS NULL`.
 *
 * The two routes behind the admin login — issue and poll — live in admin.ts with the
 * rest of the panel, so this module depends on nothing but util and can be imported by
 * both admin.ts and routes.ts without a cycle between them.
 */

import { ApiError, type Env, broadcastChange, json, requireBudget } from './util.ts';

type Cors = Record<string, string>;

/**
 * How long a pass lives. Long enough to open a banking app, pay, screenshot it and
 * upload on stall wifi; short enough that a pass someone scanned and abandoned is not
 * a way into the store an hour later.
 */
export const PASS_MINUTES = 20;

/** Cheap shape check before a DB round trip — same alphabet as an order id. */
export const looksLikeSpotPass = (v: unknown): v is string =>
	typeof v === 'string' && /^SPT_[0-9A-HJKMNP-TV-Z]{26}$/.test(v);

export interface SpotPass {
	pass_id: string;
	issued_at: string;
	expires_at: string;
	claimed_at: string | null;
	used_at: string | null;
	order_id: string | null;
}

/** A pass that is not a pass, said the same way whether it never existed or was mistyped. */
const noSuchPass = () =>
	new ApiError(404, 'no_such_pass', 'That code is not valid — ask at the stall for a new one');

/**
 * The gate. Throws unless the pass exists, is unused and has not expired.
 *
 * `expired` is computed by SQLite rather than compared here: both sides of the
 * comparison are then the same clock in the same format, and the worker never has to
 * parse 'YYYY-MM-DD HH:MM:SS' back into a Date to find out.
 */
export async function requireSpotPass(env: Env, passId: unknown): Promise<SpotPass> {
	if (!looksLikeSpotPass(passId)) throw noSuchPass();

	const row = await env.DB.prepare(
		`SELECT pass_id, issued_at, expires_at, claimed_at, used_at, order_id,
		        (expires_at <= datetime('now')) AS expired
		   FROM spot_pass WHERE pass_id = ?`,
	)
		.bind(passId)
		.first<SpotPass & { expired: number }>();

	if (!row) throw noSuchPass();
	// 410, not 404: the page has to tell "this was used up" from "this was never real",
	// because only one of them is worth asking at the stall about.
	if (row.used_at)
		throw new ApiError(410, 'pass_used', 'That code has already been used for an order');
	if (row.expired)
		throw new ApiError(410, 'pass_expired', 'That code has expired — ask at the stall for a new one');

	const { expired: _expired, ...pass } = row;
	return pass;
}

/** Shared with admin.ts, which owns the two routes behind the login. */
export const noSuchSpotPass = noSuchPass;

// ============================================================
// POST /api/spot/:pass_id/claim — the student's phone opened the link
// ============================================================
/**
 * Public, because the student has no login — the code is the credential.
 *
 * A POST from the page's own script rather than work done on GET of the page: link
 * previews and some QR scanners fetch a URL before anyone taps it, and a pass burnt by
 * a preview is a student sent back to the counter for no reason.
 */
export async function claimSpotPass(
	env: Env,
	req: Request,
	passId: string,
	cors: Cors,
	ctx?: ExecutionContext,
): Promise<Response> {
	await requireBudget(env, req, 'dist-claim');
	const pass = await requireSpotPass(env, passId);

	// Conditional UPDATE, not read-then-write: two phones on one code would both pass a
	// read, and the second must lose. `changes` is how we find out which one we are.
	const res = await env.DB.prepare(
		`UPDATE spot_pass SET claimed_at = datetime('now')
		  WHERE pass_id = ? AND claimed_at IS NULL AND used_at IS NULL
		    AND expires_at > datetime('now')`,
	)
		.bind(passId)
		.run();

	if (!res.meta.changes) {
		// Already claimed. The holder's own reload lands here too, which is why the
		// storefront keeps the code in sessionStorage and does not re-claim on every load.
		throw new ApiError(
			409,
			'already_claimed',
			'That code has already been scanned — ask at the stall for a new one',
		);
	}

	// Frees the stall screen. Payload is "something changed" and nothing more: /api/live
	// is unauthenticated, so the pass id must never ride on it.
	const fanout = broadcastChange(env, 'spot', 'pass claimed');
	if (ctx) ctx.waitUntil(fanout);
	else await fanout;

	return json({ ok: true, expires_at: pass.expires_at }, {}, cors);
}

/**
 * Spends the pass. Called after the order row exists, so a failed submit leaves the
 * student able to try again on the same code instead of walking back to the counter.
 */
export async function consumeSpotPass(env: Env, passId: string, orderId: string): Promise<void> {
	await env.DB.prepare(
		`UPDATE spot_pass SET used_at = datetime('now'), order_id = ?
		  WHERE pass_id = ? AND used_at IS NULL`,
	)
		.bind(orderId, passId)
		.run();
}
