/**
 * The merch switches, from the terminal.
 *
 *   npm run switch -- status                 what the Worker currently sees
 *   npm run switch -- shop on|off            catalogue visible to students?
 *   npm run switch -- sales on|off           checkout button on?
 *   npm run switch -- mode test|live         which Razorpay key set is in force
 *   npm run switch -- keys test|live         load that set's Razorpay credentials
 *   npm run switch -- keys clear test|live   remove that set
 *   npm run switch -- keys status            which slots are filled (names only)
 *   npm run switch -- refresh                purge the catalogue cache + poke open tabs
 *
 * `keys` prompts for the Key ID and Key Secret (hidden), refuses an id whose prefix
 * does not match the slot (a live key cannot land in the test slot or vice versa),
 * generates the webhook secret itself and prints it once for the Razorpay dashboard.
 * Against the deployed Worker it is `wrangler secret put` underneath — your
 * Cloudflare login is the credential. Against a local Worker (ANVESHA_API set to
 * localhost) it writes the same six names into .dev.vars instead, so the dev flow is
 * the same command.
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
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
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
// Two very different stdins. On a terminal, readline in terminal mode is what lets a
// password be typed without echo. Piped in (a script, or a test), readline's terminal
// mode echoes every line back and races the queued ones, so instead ALL of stdin is
// read once up front and answers are handed out in order — which is also the only way
// two prompts in one run can both be satisfied from a pipe.
const piped = !stdin.isTTY;
let queue = null;
async function pipedAnswer() {
	if (!queue) {
		let text = '';
		for await (const chunk of stdin) text += chunk;
		queue = text.split('\n');
	}
	const a = queue.shift();
	if (a === undefined) throw new Error('ran out of piped input');
	return a;
}

let rl = null;
let hideEcho = false;
function terminal() {
	if (rl) return rl;
	rl = createInterface({ input: stdin, output: stdout, terminal: true });
	// Hidden questions echo nothing after the prompt text itself.
	const orig = rl._writeToOutput;
	rl._writeToOutput = function (str) { if (!hideEcho || /: $/.test(str)) orig.call(rl, str); };
	return rl;
}

async function ask(q, { hidden = false } = {}) {
	if (piped) { stdout.write(q); const a = await pipedAnswer(); stdout.write(hidden ? '\n' : a + '\n'); return a.trim(); }
	return new Promise((resolve) => {
		hideEcho = hidden;
		terminal().question(q, (a) => {
			hideEcho = false;
			if (hidden) stdout.write('\n');
			resolve(a.trim());
		});
	});
}
// Let the process end when main() does; an open readline would keep it alive.
process.on('beforeExit', () => rl?.close());

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

// ---------- secrets: two backends, one shape ----------
const DEV_VARS = new URL('../.dev.vars', import.meta.url);
const isLocal = () => API !== PROD;
const SLOT = (set) => ({
	id: `RAZORPAY_${set.toUpperCase()}_KEY_ID`,
	secret: `RAZORPAY_${set.toUpperCase()}_KEY_SECRET`,
	webhook: `RAZORPAY_${set.toUpperCase()}_WEBHOOK_SECRET`,
});

/** wrangler reads the value (put) or the y/n confirmation (delete) from stdin when
 *  stdin is not a TTY. */
function wranglerSecret(verb, name, value) {
	const r = spawnSync('npx', ['wrangler', 'secret', verb, name], {
		cwd: new URL('..', import.meta.url),
		input: verb === 'delete' ? 'y\n' : value,
		stdio: ['pipe', 'pipe', 'inherit'],
	});
	if (r.status !== 0) throw new Error(`wrangler secret ${verb} ${name} failed`);
}

/** Rewrites NAME=value lines in .dev.vars in place; appends any that are missing. */
function devVarsSet(pairs) {
	let text = '';
	try { text = readFileSync(DEV_VARS, 'utf8'); } catch { /* new file */ }
	const lines = text.split('\n');
	for (const [k, v] of Object.entries(pairs)) {
		const i = lines.findIndex((l) => l.startsWith(`${k}=`));
		if (i >= 0) lines[i] = `${k}=${v}`;
		else lines.push(`${k}=${v}`);
	}
	writeFileSync(DEV_VARS, lines.join('\n'));
}

function putSecrets(pairs) {
	if (isLocal()) return devVarsSet(pairs);
	for (const [k, v] of Object.entries(pairs)) wranglerSecret('put', k, v);
}

function clearSecrets(names) {
	if (isLocal()) return devVarsSet(Object.fromEntries(names.map((n) => [n, ''])));
	for (const n of names) wranglerSecret('delete', n);
}

/** Which of the six names currently hold a value. Names only — values are never read back. */
function loadedSlots() {
	if (isLocal()) {
		// Re-read, not the copy parsed at startup: `keys` writes the file and then
		// shows the result in the same run.
		let fresh = {};
		try {
			fresh = Object.fromEntries(readFileSync(DEV_VARS, 'utf8').split('\n')
				.filter((l) => l.trim() && !l.trim().startsWith('#'))
				.map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
		} catch { /* no file */ }
		return new Set(Object.entries(fresh).filter(([k, v]) => k.startsWith('RAZORPAY_') && v).map(([k]) => k));
	}
	const r = spawnSync('npx', ['wrangler', 'secret', 'list'], {
		cwd: new URL('..', import.meta.url), encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'],
	});
	if (r.status !== 0) throw new Error('wrangler secret list failed');
	const start = r.stdout.indexOf('[');
	return new Set(JSON.parse(r.stdout.slice(start)).map((x) => x.name));
}

function showSlots() {
	const have = loadedSlots();
	const where = isLocal() ? '.dev.vars' : 'Cloudflare secrets';
	console.log(`  ${where}:`);
	for (const set of ['test', 'live']) {
		const s = SLOT(set);
		const parts = [['key id', s.id], ['key secret', s.secret], ['webhook secret', s.webhook]]
			.map(([label, name]) => `${have.has(name) ? '●' : '○'} ${label}`);
		const whole = have.has(s.id) && have.has(s.secret);
		console.log(`    ${set.padEnd(5)} ${parts.join('   ')}${whole ? '' : '   (incomplete — this set cannot take payments)'}`);
	}
	if (!isLocal()) {
		const mode = have.has('RAZORPAY_MODE') ? '(set as a secret — value not readable here)' : 'unset → test';
		console.log(`    mode  ${mode}`);
	}
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

	if (cmd === 'keys') {
		const sub = arg;
		const set = process.argv[4];

		if (sub === 'status') { showSlots(); return; }

		if (sub === 'clear') {
			if (set !== 'test' && set !== 'live') throw new Error(`expected clear test|live, got "${set ?? ''}"`);
			const s = SLOT(set);
			if (set === 'live' && !isLocal()) {
				const sure = await ask('Remove the LIVE Razorpay keys from the deployed Worker? Type "clear live" to confirm: ');
				if (sure !== 'clear live') { console.log('  cancelled'); return; }
			}
			clearSecrets([s.id, s.secret, s.webhook]);
			console.log(`✔ ${set} set cleared\n`);
			showSlots();
			return;
		}

		if (sub !== 'test' && sub !== 'live') throw new Error(`expected keys test|live|clear|status, got "${sub ?? ''}"`);
		const s = SLOT(sub);
		console.log(`  Loading the ${sub.toUpperCase()} set into ${isLocal() ? '.dev.vars' : 'the deployed Worker'}.`);
		console.log(`  From Razorpay → Settings → API Keys, with the dashboard in ${sub.toUpperCase()} mode.\n`);

		const keyId = await ask('  Key ID: ');
		// The prefix is Razorpay's own convention, and it is the one check that stops a
		// live key being loaded into the test slot — after which "test mode" would be
		// taking real money.
		const want = `rzp_${sub}_`;
		if (!keyId.startsWith(want))
			throw new Error(`a ${sub} Key ID starts with "${want}" — this one starts with "${keyId.slice(0, 9)}"`);
		const keySecret = await ask('  Key Secret: ', { hidden: true });
		if (keySecret.length < 16) throw new Error('that Key Secret is too short to be real');

		// The webhook secret is ours to invent, not Razorpay's to issue. Generated here
		// so it is never typed, never reused, and never weaker than 256 bits.
		const webhook = randomBytes(32).toString('hex');

		if (sub === 'live' && !isLocal()) {
			const sure = await ask('\n  These keys will take REAL money once RAZORPAY_MODE is live. Type "live" to confirm: ');
			if (sure !== 'live') { console.log('  cancelled — nothing written'); return; }
		}

		putSecrets({ [s.id]: keyId, [s.secret]: keySecret, [s.webhook]: webhook });
		console.log(`\n✔ ${sub} set loaded\n`);

		console.log('  ─── one thing left, in the Razorpay dashboard ───');
		console.log(`  With the dashboard in ${sub.toUpperCase()} mode: Settings → Webhooks → Add New Webhook`);
		console.log(`    URL     ${isLocal() ? '(local Worker — Razorpay cannot reach it; skip for dev)' : PROD + '/api/webhooks/razorpay'}`);
		console.log('    Events  payment.captured, payment.failed');
		console.log(`    Secret  ${webhook}`);
		console.log('  That secret is shown ONCE. It is already loaded on this side; paste it there.\n');

		showSlots();

		// Loading a set can flip paymentConfigured(), which changes sales_open in the
		// cached catalogue. Purge so the storefront reflects it now.
		if (!isLocal()) {
			console.log('\n  Refreshing the catalogue so the storefront sees the new gateway state…');
			const token = await login();
			show((await call('/api/admin/merch/refresh', { method: 'POST' }, token)).release);
			await call('/api/admin/logout', { method: 'POST' }, token).catch(() => {});
		}
		return;
	}

	console.log([
		'usage:',
		'  npm run switch -- status',
		'  npm run switch -- shop on|off',
		'  npm run switch -- sales on|off',
		'  npm run switch -- mode test|live',
		'  npm run switch -- keys test|live',
		'  npm run switch -- keys clear test|live',
		'  npm run switch -- keys status',
		'  npm run switch -- refresh',
	].join('\n'));
	process.exit(cmd ? 1 : 0);
}

main().catch((e) => { console.error(`✖ ${e.message}`); process.exit(1); });
