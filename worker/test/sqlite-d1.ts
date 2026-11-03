/**
 * A real SQLite database behind the slice of D1's API the Worker uses — prepare, bind,
 * first / all / run, batch — built on Node's own `node:sqlite` and loaded with the
 * project's actual schema files.
 *
 * For code whose correctness lives in the SQL itself: collectItems now merges a
 * collection inside one UPDATE (json_each, json_set, RETURNING), which a hand-written
 * fake could only pretend to run. This runs it.
 */
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

type Arg = string | number | null;

export function sqliteD1(...schemaFiles: string[]) {
	const db = new DatabaseSync(':memory:');
	for (const f of schemaFiles) db.exec(readFileSync(new URL(f, import.meta.url), 'utf8'));

	const stmt = (sql: string, args: Arg[] = []): any => ({
		bind: (...a: Arg[]) => stmt(sql, a),
		first: async () => db.prepare(sql).get(...args) ?? null,
		all: async () => ({ results: db.prepare(sql).all(...args), meta: {} }),
		run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } }),
		// What batch() runs: synchronous, so the whole batch is one transaction.
		_all: () => ({ results: db.prepare(sql).all(...args), meta: {} }),
	});

	const d1 = {
		prepare: (sql: string) => stmt(sql),
		// D1 runs a batch as one transaction in one round trip; so does this.
		batch: async (stmts: any[]) => {
			db.exec('BEGIN');
			try {
				const out = stmts.map((s) => s._all());
				db.exec('COMMIT');
				return out;
			} catch (e) {
				db.exec('ROLLBACK');
				throw e;
			}
		},
	};
	return { db, d1: d1 as unknown as D1Database };
}
