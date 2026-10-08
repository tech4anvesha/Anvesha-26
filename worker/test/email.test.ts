/**
 * What the order confirmation actually puts on the wire.
 *
 * The envelope is the part that can be wrong without anything failing: Resend ignores a
 * field it does not recognise, so a misspelled `reply_to` (replyTo, reply-to) sends every
 * buyer's question into a mailbox nobody reads and reports success while doing it. Only
 * reading the request body catches that.
 *
 * The From is checked against the same rule Resend enforces: it must be on a domain
 * verified in the Resend account. iisertvm.ac.in is not and cannot be — it is the
 * institute's domain — so it belongs in Reply-To and never in From.
 */

import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { sendOrderEmail } from '../src/email.ts';
import type { Env } from '../src/util.ts';

const ORDER = {
	to: 'buyer@iisertvm.ac.in',
	name: 'A Buyer',
	orderId: 'MER_00000000',
	transactionId: 'pay_test',
	items: [{ name: 'Tee', size: 'M', qty: 1, unitPaise: 45000, linePaise: 45000 }] as any,
	totalPaise: 45000,
};

/** Captures the single fetch the sender makes and hands back its parsed body. */
async function capture(env: Partial<Env>) {
	let body: any = null;
	const fake = mock.method(globalThis, 'fetch', async (_url: any, init: any) => {
		body = JSON.parse(init.body);
		return new Response(JSON.stringify({ id: 'test' }), { status: 200 });
	});
	const ok = await sendOrderEmail({ RESEND_API_KEY: 'test', ...env } as Env, ORDER);
	fake.mock.restore();
	return { ok, body };
}

describe('order confirmation envelope', () => {
	it('goes to the address given at checkout, and only there', async () => {
		const { ok, body } = await capture({});
		// The sender reports a MailResult now, not a bare boolean — the admin panel
		// has to tell 'delivered' apart from 'the day's quota is spent'.
		assert.deepEqual(ok, { sent: true });
		assert.deepEqual(body.to, ['buyer@iisertvm.ac.in']);
	});

	it('replies land at STC, spelled the way Resend reads it', async () => {
		const { body } = await capture({});
		// The exact key matters. Resend drops unknown fields silently.
		assert.deepEqual(body.reply_to, ['stc@iisertvm.ac.in']);
		assert.equal(body.replyTo, undefined);
	});

	it('never sends FROM the institute domain — Resend 403s on it', async () => {
		const { body } = await capture({ MAIL_FROM: "Anvesha '26 <orders@anvesha26.in>" });
		assert.match(body.from, /@anvesha26\.in>/);
		assert.doesNotMatch(body.from, /iisertvm\.ac\.in/);
	});

	it('both addresses are overridable without a code change', async () => {
		const { body } = await capture({
			MAIL_FROM: 'X <a@anvesha26.in>',
			MAIL_REPLY_TO: 'b@iisertvm.ac.in',
		});
		assert.equal(body.from, 'X <a@anvesha26.in>');
		assert.deepEqual(body.reply_to, ['b@iisertvm.ac.in']);
	});

	it('with no key it reports failure rather than throwing into the payment path', async () => {
		assert.deepEqual(await sendOrderEmail({} as Env, ORDER), { sent: false, reason: 'no_key' });
	});
});

// ---------------------------------------------------------------------------
// The daily quota.
//
// Resend's free tier is 100 messages per UTC day. On 8 Oct the panel confirmed more
// orders than that and nobody could say which students got their collection pass,
// because a failed send looked exactly like a successful one from the outside.
// These pin the three answers the panel now distinguishes.
// ---------------------------------------------------------------------------

/** A D1 stand-in holding one ledger row. */
function fakeDb(row: { sent: number; refused: number; blocked_at: string | null } | null) {
	const writes: string[] = [];
	return {
		writes,
		prepare(sql: string) {
			return {
				bind: () => this,
				first: async () => (sql.includes('SELECT') ? row : null),
				run: async () => { writes.push(sql.trim().split('\n')[0]); return { meta: { changes: 1 } }; },
			};
		},
	};
}

describe('daily mail quota', () => {
	it('does not call Resend once the day is blocked', async () => {
		let called = 0;
		const fake = mock.method(globalThis, 'fetch', async () => { called++; return new Response('{}', { status: 200 }); });
		const res = await sendOrderEmail(
			{ RESEND_API_KEY: 'k', DB: fakeDb({ sent: 100, refused: 3, blocked_at: '2026-10-08 18:00:00' }) } as unknown as Env,
			ORDER,
		);
		fake.mock.restore();
		assert.deepEqual(res, { sent: false, reason: 'quota' });
		// The point of the ledger: a spent day costs no API call at all.
		assert.equal(called, 0, 'called Resend despite a blocked day');
	});

	it('reads a 429 as quota, not as a generic failure', async () => {
		const fake = mock.method(globalThis, 'fetch', async () =>
			new Response(JSON.stringify({ name: 'daily_quota_exceeded' }), { status: 429 }));
		const res = await sendOrderEmail(
			{ RESEND_API_KEY: 'k', DB: fakeDb({ sent: 4, refused: 0, blocked_at: null }) } as unknown as Env,
			ORDER,
		);
		fake.mock.restore();
		assert.equal(res.sent, false);
		assert.equal(res.sent === false && res.reason, 'quota');
	});

	it('keeps a real failure distinct from a quota one', async () => {
		// A 500 from Resend is worth retrying later; a quota is not. Conflating them
		// would have the panel tell the admin to wait until morning over a blip.
		const fake = mock.method(globalThis, 'fetch', async () => new Response('upstream boom', { status: 500 }));
		const res = await sendOrderEmail(
			{ RESEND_API_KEY: 'k', DB: fakeDb({ sent: 4, refused: 0, blocked_at: null }) } as unknown as Env,
			ORDER,
		);
		fake.mock.restore();
		assert.equal(res.sent === false && res.reason, 'error');
	});

	it('still sends when the ledger is empty', async () => {
		const fake = mock.method(globalThis, 'fetch', async () => new Response('{"id":"x"}', { status: 200 }));
		const res = await sendOrderEmail(
			{ RESEND_API_KEY: 'k', DB: fakeDb(null) } as unknown as Env, ORDER,
		);
		fake.mock.restore();
		assert.deepEqual(res, { sent: true });
	});
});
