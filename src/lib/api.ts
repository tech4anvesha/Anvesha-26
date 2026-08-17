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

/**
 * Where the *site* lives, for links that leave this browser.
 *
 * Not `location.origin`: the distribution link is built in the admin panel and then
 * opened on a volunteer's phone, so a panel running on localhost would hand out a
 * localhost URL that works on exactly one machine. Set PUBLIC_SITE_URL when the
 * domain changes — the fallback is only there so an unconfigured build still emits a
 * reachable link rather than a broken one.
 */
export const SITE = (import.meta.env.PUBLIC_SITE_URL ?? 'https://anvesha-three.vercel.app').replace(
	/\/$/,
	'',
);
