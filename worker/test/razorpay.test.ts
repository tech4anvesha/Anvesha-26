/**
 * Razorpay's two signature schemes.
 *
 * They are easy to confuse — both are HMAC-SHA256, and swapping the secret or the
 * message between them still produces a plausible-looking hex string that simply never
 * matches. Getting either wrong fails in one of two ways, and both are bad: reject real
 * payments, or accept forged ones. So each is pinned against a vector computed
 * independently with node:crypto rather than with the function under test.
 *
 *   npm test        (node --test, using Node's native TS type stripping)
 */

import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';

import { verifyCheckoutSignature, verifyWebhookSignature } from '../src/razorpay.ts';
import type { Env } from '../src/util.ts';

const KEY_SECRET = 'test_key_secret_do_not_use';
const WEBHOOK_SECRET = 'test_webhook_secret_do_not_use';

const env = {
	RAZORPAY_KEY_ID: 'rzp_test_example',
	RAZORPAY_KEY_SECRET: KEY_SECRET,
	RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
} as Env;

/** The reference implementation, straight out of Razorpay's docs. */
const sign = (secret: string, message: string) =>
	createHmac('sha256', secret).update(message).digest('hex');

const ORDER = 'order_TZHEZyib0I06lG';
const PAYMENT = 'pay_GOOD00000001';

describe('verifyCheckoutSignature', () => {
	it('accepts the signature Checkout hands the browser', async () => {
		const sig = sign(KEY_SECRET, `${ORDER}|${PAYMENT}`);
		assert.equal(await verifyCheckoutSignature(env, ORDER, PAYMENT, sig), true);
	});

	it('is case- and whitespace-tolerant, because the wire is', async () => {
		const sig = sign(KEY_SECRET, `${ORDER}|${PAYMENT}`);
		assert.equal(await verifyCheckoutSignature(env, ORDER, PAYMENT, `  ${sig.toUpperCase()}  `), true);
	});

	it('rejects a signature for a different payment on the same order', async () => {
		const sig = sign(KEY_SECRET, `${ORDER}|pay_SOMETHINGELSE`);
		assert.equal(await verifyCheckoutSignature(env, ORDER, PAYMENT, sig), false);
	});

	it('rejects a signature for the same payment on a different order', async () => {
		const sig = sign(KEY_SECRET, `order_SOMEOTHER|${PAYMENT}`);
		assert.equal(await verifyCheckoutSignature(env, ORDER, PAYMENT, sig), false);
	});

	it('rejects one signed with the wrong secret', async () => {
		// The exact mix-up this file exists to catch: webhook secret, checkout message.
		const sig = sign(WEBHOOK_SECRET, `${ORDER}|${PAYMENT}`);
		assert.equal(await verifyCheckoutSignature(env, ORDER, PAYMENT, sig), false);
	});

	it('rejects junk without throwing', async () => {
		for (const sig of ['', 'deadbeef', 'x'.repeat(64)]) {
			assert.equal(await verifyCheckoutSignature(env, ORDER, PAYMENT, sig), false);
		}
	});

	it('refuses to run at all when the key secret is unset', async () => {
		await assert.rejects(
			() => verifyCheckoutSignature({} as Env, ORDER, PAYMENT, 'anything'),
			/not configured|not set/i,
		);
	});
});

describe('verifyWebhookSignature', () => {
	// Not re-serialised JSON: the HMAC is over the exact bytes Razorpay sent, and
	// JSON.parse -> JSON.stringify changes key order and whitespace.
	const raw = '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_1","amount":34900}}}}';

	it('accepts a body signed with the webhook secret', async () => {
		assert.equal(await verifyWebhookSignature(env, raw, sign(WEBHOOK_SECRET, raw)), true);
	});

	it('rejects a body altered after signing', async () => {
		const sig = sign(WEBHOOK_SECRET, raw);
		assert.equal(await verifyWebhookSignature(env, raw.replace('34900', '100'), sig), false);
	});

	it('rejects one signed with the key secret instead', async () => {
		assert.equal(await verifyWebhookSignature(env, raw, sign(KEY_SECRET, raw)), false);
	});

	it('rejects a missing header rather than treating absence as valid', async () => {
		assert.equal(await verifyWebhookSignature(env, raw, null), false);
	});
});
