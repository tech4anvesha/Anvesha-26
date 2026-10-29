/**
 * Stock counters.
 *
 * There are 9 medium Dragon Warriors in a box on a table. When they are gone they are
 * gone, and nothing about a web store knows that unless it is told.
 *
 * Where the counter bites is the decision that matters, because payment is manual:
 *
 *   catalogue  — reports what is left, so a sold-out size is greyed out before anyone
 *                picks it. Advisory; a stale tab will not know.
 *   checkout   — REFUSES. This runs before the student opens their banking app, so it
 *                is the last point where "sorry, that size is gone" costs nobody money.
 *   submit     — decrements, and NEVER refuses. By the time a submission arrives the
 *                student has already paid by UPI. Rejecting it would leave them out of
 *                pocket with no record of the payment anywhere, which is far worse than
 *                selling one shirt too many. If the decrement cannot fire, the order is
 *                filed with stock_taken = 0 and the panel shows it, so a human settles
 *                it with a swap or a refund.
 *
 * A missing row reads as ZERO everywhere. This is the counter that stops money being
 * taken for a thing that does not exist, so forgetting to stock an item has to make it
 * unsellable rather than unlimited.
 *
 * An item with no sizes keeps one row with size = ''. NULL is never equal to NULL in
 * SQL, so a nullable size column would make the primary key useless for precisely the
 * rows that need it.
 */

import { type PricedLine } from './cart.ts';
import { ApiError, type Env } from './util.ts';

/** merch_id -> size (or '' when the item has none) -> how many are left. */
export type StockMap = Record<string, Record<string, number>>;

/** What a line consumes. Only these two fields matter to a counter. */
type Consumes = Pick<PricedLine, 'merch_id' | 'quantity'> & { size: string | null; name?: string };

/** The key an unsized item's single row lives under. */
const slot = (size: string | null) => size ?? '';

/**
 * Every counter, in one query.
 *
 * One round trip for the whole catalogue rather than one per item, for the same reason
 * merch_images is read in one: a catalogue of N items must not cost N round trips.
 */
export async function readStock(env: Env): Promise<StockMap> {
	const { results } = await env.DB.prepare(`SELECT merch_id, size, qty FROM merch_stock`).all<{
		merch_id: string;
		size: string;
		qty: number;
	}>();

	const map: StockMap = {};
	for (const r of results) (map[r.merch_id] ??= {})[r.size] = r.qty;
	return map;
}

/**
 * Refuses a cart that cannot be filled. For checkout — before any money moves.
 *
 * Names the item and the number left rather than saying "out of stock": a student
 * holding three mediums needs to know two are available, not that they should give up.
 */
export async function requireStock(env: Env, lines: PricedLine[]): Promise<void> {
	const stock = await readStock(env);

	// Summed per slot first: three separate lines for the same shirt and size are one
	// demand on one counter, and checking them one at a time would pass a cart that
	// wants six of the four that exist.
	const want = new Map<string, { line: PricedLine; qty: number }>();
	for (const l of lines) {
		const key = `${l.merch_id}|${slot(l.size)}`;
		const seen = want.get(key);
		if (seen) seen.qty += l.quantity;
		else want.set(key, { line: l, qty: l.quantity });
	}

	for (const { line, qty } of want.values()) {
		const left = stock[line.merch_id]?.[slot(line.size)] ?? 0;
		if (left >= qty) continue;

		const what = line.size ? `${line.name} (${line.size})` : line.name;
		throw new ApiError(
			409,
			'out_of_stock',
			left === 0
				? `${what} is sold out — please take it out of your bag`
				: `Only ${left} of ${what} left — please lower the quantity`,
		);
	}
}

/**
 * Takes the stock. Returns true only if EVERY line came off the shelf.
 *
 * `WHERE qty >= ?` is what makes this safe without a transaction around a read: two
 * submissions racing for the last shirt both run the same UPDATE and exactly one of
 * them changes a row. The loser gets `changes = 0`, which is the honest answer.
 *
 * All of it in one batch — a batch is one transaction, so a cart of five items cannot
 * come off the shelf halfway.
 */
export async function takeStock(env: Env, lines: PricedLine[]): Promise<boolean> {
	if (!lines.length) return true;

	const stmts = lines.map((l) =>
		env.DB.prepare(
			`UPDATE merch_stock SET qty = qty - ? WHERE merch_id = ? AND size = ? AND qty >= ?`,
		).bind(l.quantity, l.merch_id, slot(l.size), l.quantity),
	);

	const res = await env.DB.batch(stmts);
	const all = res.every((r) => r.meta.changes === 1);
	if (!all)
		// Worth a log line: it means the storefront let somebody buy something that was
		// already gone, and the order now needs a person.
		console.warn('stock: some lines could not be taken', JSON.stringify(lines.map((l) => [l.merch_id, l.size, l.quantity])));
	return all;
}

/**
 * Puts it back. For a rejected or deleted order, and ONLY for one whose stock_taken is 1
 * — adding back stock that was never taken invents inventory, which is the one way a
 * counter can lie in the dangerous direction.
 *
 * Unconditional UPDATE: putting stock back must never be the thing that fails, and the
 * CHECK on the column only forbids going below zero.
 */
export async function returnStock(env: Env, lines: Consumes[]): Promise<void> {
	if (!lines.length) return;

	await env.DB.batch(
		lines.map((l) =>
			env.DB.prepare(`UPDATE merch_stock SET qty = qty + ? WHERE merch_id = ? AND size = ?`).bind(
				l.quantity,
				l.merch_id,
				slot(l.size),
			),
		),
	);
}

/**
 * The lines of an order as stored, for a restore. Returns [] on anything unreadable:
 * a rejection must not fail because one order's JSON is malformed.
 */
export function linesOf(orderInfo: string | null): Consumes[] {
	try {
		const parsed = JSON.parse(orderInfo ?? '[]') as Consumes[];
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(l) => typeof l?.merch_id === 'string' && Number.isInteger(l?.quantity) && l.quantity > 0,
		);
	} catch {
		return [];
	}
}
