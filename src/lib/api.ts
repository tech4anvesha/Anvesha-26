/**
 * Worker API base URL.
 *
 * Set PUBLIC_API_URL in Vercel (or .env) for production. Falls back to
 * PUBLIC_API_BASE for older configs, then localhost for wrangler dev.
 */
const raw =
	import.meta.env.PUBLIC_API_URL ??
	import.meta.env.PUBLIC_API_BASE ??
	'http://127.0.0.1:8787';

export const API = raw.replace(/\/$/, '');
