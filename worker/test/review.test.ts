/**
 * The manual payment review.
 *
 * Two pieces are worth pinning down, and both are about failing in the safe direction:
 *
 *   looksLikeImage — the public upload route is the only place a stranger can put bytes
 *   into our bucket, and those bytes are served back later with the content-type the
 *   uploader declared. `File.type` is entirely client-controlled, so this is the only
 *   thing standing between "image/png" and a file that is not one.
 *
 *   The review state machine — an order may go pending → rejected → pending → confirmed,
 *   and must never go backwards out of confirmed. The transitions are expressed as SQL
 *   guards rather than code, so what is tested here is the decision table those guards
 *   implement.
 *
 *   npm test        (node --test, using Node's native TS type stripping)
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { looksLikeImage } from '../src/util.ts';

/** A File carrying exactly these bytes, labelled however the caller likes. */
const fileOf = (bytes: number[], type: string) =>
	new File([new Uint8Array(bytes)], 'shot', { type });

// Real headers, not invented ones — these are the bytes a phone screenshot starts with.
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46];
const GIF = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
const AVIF = [0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66];
const HTML = [...'<html><body>'].map((c) => c.charCodeAt(0));

describe('looksLikeImage', () => {
	it('accepts each format we claim to accept', async () => {
		assert.equal(await looksLikeImage(fileOf(PNG, 'image/png'), 'image/png'), true);
		assert.equal(await looksLikeImage(fileOf(JPEG, 'image/jpeg'), 'image/jpeg'), true);
		assert.equal(await looksLikeImage(fileOf(GIF, 'image/gif'), 'image/gif'), true);
		assert.equal(await looksLikeImage(fileOf(WEBP, 'image/webp'), 'image/webp'), true);
		assert.equal(await looksLikeImage(fileOf(AVIF, 'image/avif'), 'image/avif'), true);
	});

	it('rejects a file that is not an image at all, however it is labelled', async () => {
		for (const type of ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']) {
			assert.equal(await looksLikeImage(fileOf(HTML, type), type), false, `HTML passed as ${type}`);
		}
	});

	it('rejects a real image labelled as a different format', async () => {
		// Harmless in itself, but it would be stored under the wrong extension and served
		// back with a content-type its bytes do not match.
		assert.equal(await looksLikeImage(fileOf(PNG, 'image/jpeg'), 'image/jpeg'), false);
		assert.equal(await looksLikeImage(fileOf(JPEG, 'image/png'), 'image/png'), false);
	});

	it('rejects a type we never accept, even with matching bytes', async () => {
		// image/svg+xml is the one that matters: SVG is a script-execution vector, and it
		// is not in IMAGE_TYPES precisely so it can never be stored or served.
		const svg = [...'<svg xmlns='].map((c) => c.charCodeAt(0));
		assert.equal(await looksLikeImage(fileOf(svg, 'image/svg+xml'), 'image/svg+xml'), false);
	});

	it('rejects a truncated header rather than reading past the end', async () => {
		assert.equal(await looksLikeImage(fileOf([0x89, 0x50], 'image/png'), 'image/png'), false);
		assert.equal(await looksLikeImage(fileOf([], 'image/png'), 'image/png'), false);
	});

	it('rejects a WebP whose second marker is wrong', async () => {
		// RIFF is shared with WAV and AVI; without the WEBP marker at offset 8 this would
		// accept an audio file as an image.
		const riffOnly = [0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x41, 0x56, 0x45];
		assert.equal(await looksLikeImage(fileOf(riffOnly, 'image/webp'), 'image/webp'), false);
	});
});

// ---------------------------------------------------------------------------
// The review state machine, as the SQL guards implement it.
//
// submitPayment accepts only `payment_status='unpaid'` AND review_status not 'pending'.
// adminReviewOrder accepts only `review_status='pending'`, and its UPDATE is further
// guarded on `payment_status='unpaid'`. Those two sentences are the whole table.
// ---------------------------------------------------------------------------

type Review = 'none' | 'pending' | 'confirmed' | 'rejected';
type Order = { payment: 'unpaid' | 'paid' | 'failed'; review: Review };

const canSubmit = (o: Order) => o.payment === 'unpaid' && o.review !== 'pending';
const canReview = (o: Order) => o.review === 'pending' && o.payment === 'unpaid';

describe('review state machine', () => {
	it('a fresh order accepts a payment', () => {
		assert.equal(canSubmit({ payment: 'unpaid', review: 'none' }), true);
	});

	it('refuses a second submission while one is already in the queue', () => {
		// Otherwise a student could swap the evidence out from under the admin reading it.
		assert.equal(canSubmit({ payment: 'unpaid', review: 'pending' }), false);
	});

	it('lets a rejected order be fixed and resubmitted', () => {
		// The whole reason reject leaves payment_status at 'unpaid' rather than 'failed'.
		assert.equal(canSubmit({ payment: 'unpaid', review: 'rejected' }), true);
	});

	it('refuses anything once the order is paid', () => {
		for (const review of ['none', 'pending', 'confirmed', 'rejected'] as Review[]) {
			assert.equal(canSubmit({ payment: 'paid', review }), false, `paid/${review} accepted a submission`);
			assert.equal(canReview({ payment: 'paid', review }), false, `paid/${review} accepted a review`);
		}
	});

	it('only reviews what is actually waiting', () => {
		assert.equal(canReview({ payment: 'unpaid', review: 'pending' }), true);
		for (const review of ['none', 'confirmed', 'rejected'] as Review[]) {
			assert.equal(canReview({ payment: 'unpaid', review }), false, `reviewed a ${review} order`);
		}
	});

	it('survives the full round trip: none → pending → rejected → pending → confirmed', () => {
		let o: Order = { payment: 'unpaid', review: 'none' };

		assert.ok(canSubmit(o));
		o = { ...o, review: 'pending' };

		assert.ok(canReview(o));
		o = { ...o, review: 'rejected' }; // payment deliberately untouched

		assert.ok(canSubmit(o), 'a rejected order must stay payable');
		o = { ...o, review: 'pending' };

		assert.ok(canReview(o));
		o = { payment: 'paid', review: 'confirmed' };

		// And the door closes behind it.
		assert.equal(canSubmit(o), false);
		assert.equal(canReview(o), false);
	});
});
