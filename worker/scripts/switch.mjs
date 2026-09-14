/**
 * The merch switches, from the terminal.
 *
 *   npm run switch -- status                 what the Worker currently sees
 *   npm run switch -- shop on|off            catalogue visible to students?
 *   npm run switch -- sales on|off           checkout button on?
 *   npm run switch -- mode test|live         which Razorpay key set is in force
 *   npm run switch -- refresh                purge the catalogue cache + poke open tabs
 *
 * This is a CLIENT of the admin API, not a shortcut around it. `shop` and `sales` call
 * the same two endpoints the admin panel's buttons do, so a change made here is
 * attributed to you, purges the edge cache, and reaches open tabs — exactly as a click
 * would. A raw `wrangler d1 execute ... UPDATE merch_release` would do none of those.
 *
 * `mode` is the one thing the API cannot do, on purpose: real money must never be one
 * request away from a stolen admin session. It runs `wrangler secret put RAZORPAY_MODE`
 * (which needs your Cloudflare login, not the panel password) and then calls `refresh`
 * so the new answer is served immediately.
 *
 * Auth: prompts for the admin panel password, hidden. Who you are comes from
 * ANVESHA_ADMIN_NAME / _ROLL / _EMAIL in the environment or .dev.vars, or is prompted.
 * Target: ANVESHA_API, default the deployed Worker.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';

const PROD = 'https://anvesha-merch-api.tech4anvesha.workers.dev';

// ---------- .dev.vars, for the identity fields only ----------
let vars = {};
try {
	vars = Object.fromEntries(
		readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8')
			.split('\n')
			.filter((l) => l.trim() && !l.trim().startsWith('#'))
			.map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
	);
} catch { /* optional */ }

const API = (process.env.ANVESHA_API ?? vars.ANVESHA_API ?? PROD).replace(/\/$/, '');
const [cmd, arg] = process.argv.slice(2);

// ---------- prompts ----------
function ask(q, { hidden = false } = {}) {
	return new Promise((resolve) => {
		const rl = createInterface({ input: stdin, output: stdout, terminal: true });
		if (hidden) {
			// Echo nothing after the prompt: readline's own echo is suppressed by
			// overriding _writeToOutput for the duration of this one question.
			const orig = rl._writeToOutput;
			rl._writeToOutput = function (str) { if (str.includes(q)) orig.call(rl, q); };
		}
		rl.question(q, (a) => { rl.close(); if (hidden) stdout.write('\n'); resolve(a.trim()); });
	});
}

async function identity() {
	const get = async (key, label) =>
		process.env[key] ?? vars[key] ?? (await ask(`${label}: `));
	return {
		name: await get('ANVESHA_ADMIN_NAME', 'Your name'),
		roll_number: await get('ANVESHA_ADMIN_ROLL', 'Your roll number'),
		collegemail: await get('ANVESHA_ADMIN_EMAIL', 'Your @iisertvm.ac.in email'),
	};
}

// ---------- api ----------
async function call(path, init = {}, token) {
	const res = await fetch(API + path, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(init.headers ?? {}),
		},
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(`${res.status} ${body.error ?? ''} ${body.message ?? ''}`.trim());
	return body;
}

async function login() {
	const who = await identity();
	const password = await ask('Admin panel password: ', { hidden: true });
	const r = await call('/api/admin/login', { method: 'POST', body: JSON.stringify({ ...who, password }) });
	return r.token;
}

// ---------- output ----------
const when = (iso) => {
	if (!iso) return '';
	const d = new Date(iso.replace(' ', 'T') + 'Z');
	return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};
const lamp = (on) => (on ? '●' : '○');
const line = (label, st, onWord, offWord) =>
	`  ${lamp(st.active)} ${label.padEnd(9)} ${(st.active ? onWord : offWord).padEnd(8)}` +
	(st.by_name ? `  ${st.active ? 'opened' : 'closed'} by ${st.by_name}${st.at ? ' · ' + when(st.at) : ''}` : '');

function show(release) {
	const g = release.gateway;
	console.log(line('catalogue', release.shop, 'VISIBLE', 'HIDDEN'));
	console.log(line('sales', release.sales, 'OPEN', 'CLOSED'));
	const behind = g.counter ? 'counter payments' : g.configured ? `Razorpay · ${g.mode} keys` : 'none configured';
	const warn = release.sales.active && !g.configured;
	console.log(`  ${warn ? '!' : ' '} gateway   ${behind}${warn ? '   <- sales are on but nothing can take the money; checkout stays off' : ''}`);
	console.log(`  · mode      ${g.mode}${g.configured ? '' : '   (this set is incomplete)'}`);
}

// ---------- commands ----------
const onOff = (v) => {
	if (v === 'on') return true;
	if (v === 'off') return false;
	throw new Error(`expected on|off, got "${v ?? ''}"`);
};

async function main() {
	console.log(`→ ${API}\n`);

	if (cmd === 'status') {
		const token = await login();
		show((await call('/api/admin/merch', {}, token)).release);
		await call('/api/admin/logout', { method: 'POST' }, token).catch(() => {});
		return;
	}

	if (cmd === 'shop' || cmd === 'sales') {
		const active = onOff(arg);
		const token = await login();
		const path = cmd === 'shop' ? '/api/admin/merch/release' : '/api/admin/merch/sales';
		const r = await call(path, { method: 'POST', body: JSON.stringify({ active }) }, token);
		console.log(`✔ ${cmd} → ${active ? 'on' : 'off'}\n`);
		show(r.release);
		await call('/api/admin/logout', { method: 'POST' }, token).catch(() => {});
		return;
	}

	if (cmd === 'refresh') {
		const token = await login();
		const r = await call('/api/admin/merch/refresh', { method: 'POST' }, token);
		console.log('✔ catalogue cache purged, open tabs notified\n');
		show(r.release);
		await call('/api/admin/logout', { method: 'POST' }, token).catch(() => {});
		return;
	}

	if (cmd === 'mode') {
		if (arg !== 'test' && arg !== 'live') throw new Error(`expected test|live, got "${arg ?? ''}"`);
		if (API !== PROD) {
			console.log(`  ${API} is not the deployed Worker — for local dev, set RAZORPAY_MODE in .dev.vars instead.`);
			process.exit(2);
		}
		if (arg === 'live') {
			const sure = await ask('This makes checkout take REAL money. Type "live" to confirm: ');
			if (sure !== 'live') { console.log('  cancelled'); return; }
		}
		// wrangler reads the value from stdin when it is not a TTY. Needs the Cloudflare
		// login on this machine, which is the second factor: the panel password alone
		// cannot do this.
		const r = spawnSync('npx', ['wrangler', 'secret', 'put', 'RAZORPAY_MODE'], {
			cwd: new URL('..', import.meta.url),
			input: arg,
			stdio: ['pipe', 'inherit', 'inherit'],
		});
		if (r.status !== 0) throw new Error('wrangler secret put failed');
		console.log(`✔ RAZORPAY_MODE → ${arg}\n`);

		// The mode changes what sales_open evaluates to, but touches no row that would
		// purge the cache. Refresh so the storefront sees it now, not in a minute.
		const token = await login();
		show((await call('/api/admin/merch/refresh', { method: 'POST' }, token)).release);
		await call('/api/admin/logout', { method: 'POST' }, token).catch(() => {});
		return;
	}

	console.log([
		'usage:',
		'  npm run switch -- status',
		'  npm run switch -- shop on|off',
		'  npm run switch -- sales on|off',
		'  npm run switch -- mode test|live',
		'  npm run switch -- refresh',
	].join('\n'));
	process.exit(cmd ? 1 : 0);
}

main().catch((e) => { console.error(`✖ ${e.message}`); process.exit(1); });
