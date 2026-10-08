/**
 * Order confirmation email, sent through Resend.
 *
 * Everything here is best-effort by design. A paid order is already durable in D1 by
 * the time this runs, so a Resend outage, a bounced address or a missing key must
 * never turn a successful payment into a failed request — `sendOrderEmail` therefore
 * resolves rather than throws, and logs instead.
 *
 * The markup is deliberately 2005-era: tables, inline styles, no flexbox and no
 * external CSS. Mail clients are not browsers; Outlook still renders with Word.
 */

import { formatRupees, type PricedLine } from './cart.ts';
import { qrPng, toBase64 } from './qr.ts';
import type { Env } from './util.ts';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

// Resend's shared sender. Works with no domain set up, but only delivers to the
// address that owns the Resend account — set MAIL_FROM once a domain is verified.
const DEFAULT_FROM = "Anvesha '26 <onboarding@resend.dev>";

/**
 * Where a reply goes, which is NOT where the mail comes from.
 *
 * Resend will only send `from` a domain verified in the Resend account, and it enforces
 * that hard — an unverified domain is a 403 and no email at all. Verified here:
 * anvesha26.in. NOT verified, and never going to be: iisertvm.ac.in, which is the
 * institute's own domain and would need IISER's IT to publish DKIM records letting this
 * account send as the whole institute.
 *
 * So the From stays on the domain we own and Reply-To carries the address a buyer should
 * actually reach. Hitting Reply on the confirmation lands in the STC inbox, which is the
 * thing that was wanted; the envelope sender is a deliverability constraint, not a
 * preference.
 */
/** Where a student looks their order up: the fallback when this mail goes astray, and
 *  where a rejected one goes to try again. */
const ORDER_PAGE = 'https://anvesha26.in/order';

const DEFAULT_REPLY_TO = 'stc@iisertvm.ac.in';

const INK = '#0b0b0f';
const ACCENT = '#9333ea'; // keep in sync with --accent in src/styles/theme.css
const PAPER = '#ffffff';
const SINK = '#f5f5f6';
const MONO = "'DM Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";
const SANS = "'Archivo', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export interface OrderEmail {
	to: string;
	name: string;
	orderId: string;
	transactionId: string;
	items: PricedLine[];
	totalPaise: number;
}

/** Escapes text bound for HTML. Item names come from D1, but nothing untrusted is
 *  ever interpolated raw — an apostrophe in a product name should not be able to
 *  break the markup. */
function esc(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

const label = (l: PricedLine) => `${l.name}${l.size ? ` · ${l.size}` : ''} × ${l.quantity}`;

function html(o: OrderEmail): string {
	const rows = o.items
		.map(
			(l) => `
			<tr>
				<td style="padding:10px 0;border-bottom:1px solid #e6e6e8;font:14px ${SANS};color:${INK};">${esc(label(l))}</td>
				<td style="padding:10px 0;border-bottom:1px solid #e6e6e8;font:600 14px ${SANS};color:${INK};text-align:right;white-space:nowrap;">₹${formatRupees(l.line_total_paise)}</td>
			</tr>`,
		)
		.join('');

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Order confirmed — Anvesha '26</title>
</head>
<body style="margin:0;padding:0;background:${SINK};">
	<!-- preheader: the grey line mail clients show beside the subject -->
	<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
		Order ${esc(o.orderId)} is confirmed. Your collection QR is attached.
	</div>

	<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SINK};padding:28px 12px;">
		<tr><td align="center">
			<table role="presentation" width="600" cellpadding="0" cellspacing="0"
			       style="width:100%;max-width:600px;background:${PAPER};border:2px solid ${INK};">

				<!-- masthead -->
				<tr><td style="padding:26px 30px 0;">
					<div style="font:800 20px ${SANS};letter-spacing:.06em;color:${INK};">
						ANVESHA<span style="color:${ACCENT};">'26</span>
					</div>
					<div style="height:4px;background:${ACCENT};width:56px;margin-top:12px;"></div>
				</td></tr>

				<tr><td style="padding:22px 30px 0;">
					<h1 style="margin:0;font:800 26px ${SANS};letter-spacing:-.01em;color:${INK};">Order confirmed</h1>
					<p style="margin:12px 0 0;font:15px ${SANS};line-height:1.6;color:#4a4a52;">
						Hi ${esc(o.name)}, we've got your order and your payment. Your collection QR
						is attached to this email.
					</p>
				</td></tr>

				<!-- invoice -->
				<tr><td style="padding:26px 30px 0;">
					<div style="font:${MONO};font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#8a8a92;padding-bottom:6px;">Invoice</div>
					<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
						${rows}
						<tr>
							<td style="padding:14px 0 0;font:800 16px ${SANS};color:${INK};">Total paid</td>
							<td style="padding:14px 0 0;font:800 22px ${SANS};color:${INK};text-align:right;white-space:nowrap;">₹${formatRupees(o.totalPaise)}</td>
						</tr>
					</table>
				</td></tr>

				<!-- ids -->
				<tr><td style="padding:24px 30px 0;">
					<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
					       style="background:${SINK};border:2px solid ${INK};">
						<tr><td style="padding:14px 16px;">
							<div style="font:${MONO};font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:#8a8a92;">Order id</div>
							<div style="font:${MONO};font-size:13px;color:${INK};word-break:break-all;padding-top:4px;">${esc(o.orderId)}</div>
							<div style="font:${MONO};font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:#8a8a92;padding-top:12px;">Transaction</div>
							<div style="font:${MONO};font-size:13px;color:${INK};word-break:break-all;padding-top:4px;">${esc(o.transactionId)}</div>
						</td></tr>
					</table>
				</td></tr>

				<!-- collection -->
				<tr><td style="padding:24px 30px 0;">
					<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
					       style="background:${PAPER};border:2px solid ${INK};">
						<tr><td style="padding:14px 16px;font:14px ${SANS};line-height:1.6;color:${INK};">
							<strong style="color:${ACCENT};">Collecting your order.</strong> Show the attached QR
							at the Anvesha merch desk. Keep it safe — anyone holding it can collect this order.
						</td></tr>
					</table>
				</td></tr>

				<tr><td style="padding:22px 30px 30px;">
					<p style="margin:0;font:12px ${SANS};line-height:1.6;color:#8a8a92;">
						Your UPI payment has been checked against our statement and confirmed.
						This email is your receipt — no reply needed. Lost it? The same pass is at
						<a href="${ORDER_PAGE}" style="color:#8a8a92;">anvesha26.in/order</a>.
					</p>
				</td></tr>
			</table>

			<div style="font:11px ${SANS};color:#9a9aa2;padding-top:14px;">
				Anvesha '26 · IISER Thiruvananthapuram
			</div>
		</td></tr>
	</table>
</body>
</html>`;
}

/** Plain-text alternative. Not optional: a mail with no text part scores worse with
 *  spam filters and is unreadable in text-only clients. */
function text(o: OrderEmail): string {
	const lines = o.items.map((l) => `  ${label(l)}  —  ₹${formatRupees(l.line_total_paise)}`).join('\n');
	return [
		"ANVESHA '26 — ORDER CONFIRMED",
		'',
		`Hi ${o.name}, we've got your order and your payment.`,
		'',
		'INVOICE',
		lines,
		`  Total paid: ₹${formatRupees(o.totalPaise)}`,
		'',
		`Order id:    ${o.orderId}`,
		`Transaction: ${o.transactionId}`,
		'',
		'Show the attached QR at the Anvesha merch desk to collect.',
		'Keep it safe — anyone holding it can collect this order.',
		'',
		"Anvesha '26 · IISER Thiruvananthapuram",
	].join('\n');
}

/**
 * Whether a message went out, and if not, why.
 *
 * A boolean was enough while nobody acted on the answer. It is not enough now: the
 * admin panel has to tell the difference between "the student has their pass" and
 * "the day's quota is spent, note this one down" — and those are the same `false`.
 */
export type MailResult =
	| { sent: true }
	| { sent: false; reason: 'no_key' | 'quota' | 'error'; status?: number; detail?: string };

export interface MailBlock {
	/** True only because Resend answered 429. There is no other source of truth. */
	blocked: boolean;
	/** ISO instant of the next UTC midnight — when Resend's day rolls over. */
	resetsAt: string;
}

/** The next UTC midnight. Resend's day is a UTC calendar day, not a rolling window. */
function nextUtcMidnight(): string {
	const d = new Date();
	d.setUTCHours(24, 0, 0, 0);
	return d.toISOString();
}

/**
 * Today's ledger row, created on first use.
 *
 * Read before every send, so a day that Resend has already refused costs no API call
 * at all — the panel is told "quota" immediately rather than after a round trip.
 */
export async function mailBlock(env: Env): Promise<MailBlock> {
	const row = await env.DB.prepare(
		`SELECT blocked_at FROM mail_quota WHERE utc_day = date('now')`,
	).first<{ blocked_at: string | null }>();

	return { blocked: Boolean(row?.blocked_at), resetsAt: nextUtcMidnight() };
}

/** Resend said no. The only thing recorded, and the only thing trusted. */
async function recordRefusal(env: Env): Promise<void> {
	await env.DB.prepare(
		`INSERT INTO mail_quota (utc_day, blocked_at) VALUES (date('now'), datetime('now'))
		 ON CONFLICT (utc_day) DO UPDATE SET blocked_at = COALESCE(blocked_at, datetime('now'))`,
	).run();
}

/**
 * Send, and record what happened.
 *
 * Shared by both templates so the ledger cannot miss one. Never throws: a mail problem
 * must not fail a payment that already went through — it only has to be REPORTED now,
 * which is the whole change.
 */
async function deliver(env: Env, payload: unknown, label: string): Promise<MailResult> {
	if (!env.RESEND_API_KEY) {
		console.warn('email: RESEND_API_KEY not set, skipping', label);
		return { sent: false, reason: 'no_key' };
	}

	const block = await mailBlock(env).catch(() => null);
	if (block?.blocked) {
		console.warn(`email: Resend refused earlier today, skipping ${label}`);
		return { sent: false, reason: 'quota' };
	}

	try {
		const res = await fetch(RESEND_ENDPOINT, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.RESEND_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		if (res.ok) return { sent: true };

		const body = await res.text();
		// 429 is the quota, but Resend also names it in the body — match either, because
		// a plan change could move the status and the wording is the surer signal.
		const isQuota = res.status === 429 || /quota|rate.?limit/i.test(body);
		if (isQuota) {
			await recordRefusal(env).catch((e) => console.error('email: could not record the refusal', e));
			console.error(`email: QUOTA REACHED, ${label} not sent`);
			return { sent: false, reason: 'quota', status: res.status, detail: body.slice(0, 200) };
		}

		console.error('email: resend rejected', res.status, body);
		return { sent: false, reason: 'error', status: res.status, detail: body.slice(0, 200) };
	} catch (e) {
		console.error('email: send failed for', label, e);
		return { sent: false, reason: 'error', detail: String(e).slice(0, 200) };
	}
}

/**
 * Sends the confirmation. Resolves either way — never throws into the payment path.
 * Returns whether the mail was actually accepted, which is what the tests assert on.
 */
export async function sendOrderEmail(env: Env, o: OrderEmail): Promise<MailResult> {
	return deliver(
		env,
		{
			from: env.MAIL_FROM || DEFAULT_FROM,
			// Resend's field is reply_to, not replyTo — it is silently ignored if
			// misspelled, and a silently ignored Reply-To sends every buyer's question
			// to a mailbox nobody reads.
			reply_to: [env.MAIL_REPLY_TO || DEFAULT_REPLY_TO],
			to: [o.to],
			subject: `Your Anvesha '26 order — ${o.orderId}`,
			html: html(o),
			text: text(o),
			attachments: [{ filename: `anvesha-${o.orderId}.png`, content: toBase64(qrPng(o.orderId)) }],
		},
		`confirmation for ${o.orderId}`,
	);
}

// ============================================================
// Rejection
// ============================================================
export interface RejectionEmail {
	to: string;
	name: string;
	orderId: string;
	/** The reference the student submitted, echoed so they can see what we looked at. */
	paymentRef: string;
	/** The admin's note. May be empty — plenty of rejections need no essay. */
	reason: string;
}

function rejectionHtml(o: RejectionEmail): string {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>We could not confirm your payment — Anvesha '26</title>
</head>
<body style="margin:0;padding:0;background:${SINK};">
	<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
		We could not confirm the payment for order ${esc(o.orderId)}. You can submit it again.
	</div>

	<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SINK};padding:28px 12px;">
		<tr><td align="center">
			<table role="presentation" width="600" cellpadding="0" cellspacing="0"
			       style="width:100%;max-width:600px;background:${PAPER};border:2px solid ${INK};">

				<tr><td style="padding:26px 30px 0;">
					<div style="font:800 20px ${SANS};letter-spacing:.06em;color:${INK};">
						ANVESHA<span style="color:${ACCENT};">'26</span>
					</div>
					<div style="height:4px;background:${ACCENT};width:56px;margin-top:12px;"></div>
				</td></tr>

				<tr><td style="padding:22px 30px 0;">
					<h1 style="margin:0;font:800 26px ${SANS};letter-spacing:-.01em;color:${INK};">We couldn't confirm that payment</h1>
					<p style="margin:12px 0 0;font:15px ${SANS};line-height:1.6;color:#4a4a52;">
						Hi ${esc(o.name)}, we checked the payment you submitted for order
						${esc(o.orderId)} against our UPI statement and couldn't match it.
						Nothing has been charged by us, and your order is still waiting.
					</p>
				</td></tr>

				<tr><td style="padding:24px 30px 0;">
					<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
					       style="background:${SINK};border:2px solid ${INK};">
						<tr><td style="padding:14px 16px;">
							<div style="font:${MONO};font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:#8a8a92;">Reference you sent</div>
							<div style="font:${MONO};font-size:13px;color:${INK};word-break:break-all;padding-top:4px;">${esc(o.paymentRef) || '—'}</div>
							${
								o.reason
									? `<div style="font:${MONO};font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:#8a8a92;padding-top:12px;">What we found</div>
							<div style="font:14px ${SANS};line-height:1.55;color:${INK};padding-top:4px;">${esc(o.reason)}</div>`
									: ''
							}
						</td></tr>
					</table>
				</td></tr>

				<tr><td style="padding:24px 30px 0;">
					<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
					       style="background:${PAPER};border:2px solid ${INK};">
						<tr><td style="padding:14px 16px;font:14px ${SANS};line-height:1.6;color:${INK};">
							<strong style="color:${ACCENT};">Try again.</strong> Open
							<a href="${ORDER_PAGE}" style="color:${INK};">anvesha26.in/order</a>, look your
							order up with your roll number and mobile, and submit the reference and
							screenshot again. If you think this is our mistake, just reply to this email.
						</td></tr>
					</table>
				</td></tr>

				<tr><td style="padding:22px 30px 30px;">
					<p style="margin:0;font:12px ${SANS};line-height:1.6;color:#8a8a92;">
						Order ${esc(o.orderId)} — still unpaid, nothing lost.
					</p>
				</td></tr>
			</table>

			<div style="font:11px ${SANS};color:#9a9aa2;padding-top:14px;">
				Anvesha '26 · IISER Thiruvananthapuram
			</div>
		</td></tr>
	</table>
</body>
</html>`;
}

function rejectionText(o: RejectionEmail): string {
	return [
		`We couldn't confirm that payment`,
		``,
		`Hi ${o.name}, we checked the payment you submitted for order ${o.orderId}`,
		`against our UPI statement and couldn't match it. Nothing has been charged by`,
		`us, and your order is still waiting.`,
		``,
		`Reference you sent: ${o.paymentRef || '—'}`,
		...(o.reason ? [`What we found: ${o.reason}`] : []),
		``,
		`Try again at ${ORDER_PAGE} — look your order up with your roll number and`,
		`mobile, then submit the reference and screenshot again. If you think this is`,
		`our mistake, reply to this email.`,
		``,
		`Anvesha '26 · IISER Thiruvananthapuram`,
	].join('\n');
}

/**
 * Tells a student their payment could not be matched, and how to resubmit.
 *
 * Same best-effort contract as sendOrderEmail: resolves either way, never throws into
 * the admin's review action. An admin pressing REJECT must not see an error because a
 * mail server was slow.
 */
export async function sendRejectionEmail(env: Env, o: RejectionEmail): Promise<MailResult> {
	return deliver(
		env,
		{
			from: env.MAIL_FROM || DEFAULT_FROM,
			reply_to: [env.MAIL_REPLY_TO || DEFAULT_REPLY_TO],
			to: [o.to],
			subject: `Action needed on your Anvesha '26 order — ${o.orderId}`,
			html: rejectionHtml(o),
			text: rejectionText(o),
			// No QR: there is nothing to collect yet, and attaching one would be the
			// single worst thing this mail could do.
		},
		`rejection notice for ${o.orderId}`,
	);
}
