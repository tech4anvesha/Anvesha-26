/**
 * `npm test` runs the Worker's own source under plain Node, which has no idea what
 * `cloudflare:workers` is — and src/index.ts re-exports the Durable Object class, so
 * every router test failed to even load once the hub was added.
 *
 * This registers a resolve hook that hands back a one-line stand-in for that module.
 * Only `DurableObject` is needed, and only as a base class: nothing in the test suite
 * constructs a hub, it just has to be importable.
 *
 * The alternative was dropping the DO export from the entry point (the runtime needs
 * it there) or giving up the 13 tests that exercise the real router.
 */
import { registerHooks } from 'node:module';

const STUB = 'data:text/javascript,'
	+ encodeURIComponent('export class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }');

registerHooks({
	resolve(specifier, context, next) {
		if (specifier === 'cloudflare:workers') return { url: STUB, shortCircuit: true };
		return next(specifier, context);
	},
});
