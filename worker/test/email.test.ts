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
		assert.equal(ok, true);
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
		assert.equal(await sendOrderEmail({} as Env, ORDER), false);
	});
});
