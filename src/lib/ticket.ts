/**
 * The collection pass: its QR, and the flat PNG a student can keep.
 *
 * Lives here rather than in merch.astro because two pages draw the same ticket now —
 * the checkout popup (before payment review existed) and /order, where a student looks
 * their pass up after an admin has confirmed it. One copy, so the two can never drift
 * into printing different passes for the same order.
 */
import qrcode from 'qrcode-generator';

/** Everything the printed card needs. The page supplies it; this module draws it. */
export type ReceiptData = {
	order_id: string;
	transaction_id: string;
	total_price_paise: number;
	items: { name: string; size: string | null; quantity: number; line_total_paise: number }[];
	name: string;
	roll_number: string;
};

/** Money lives in paise end to end; rupees exist only for display. */
const rupees = (paise: number) =>
	'₹' + (paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2));

export function drawQR(canvas: HTMLCanvasElement, text: string, targetPx = 328) {
	const qr = qrcode(0, 'M');
	qr.addData(text);
	qr.make();

	const count = qr.getModuleCount();
	const quiet = 4;                       // required silent margin, in modules
	// Whole device pixels per module, always: a fractional scale lands module edges
	// mid-pixel and the antialiasing is what makes a QR hard to read.
	const scale = Math.max(2, Math.floor(targetPx / (count + quiet * 2)));
	const size = (count + quiet * 2) * scale;
	canvas.width = size;
	canvas.height = size;

	const ctx = canvas.getContext('2d')!;
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, size, size);
	ctx.fillStyle = '#0b0b0f';
	for (let r = 0; r < count; r++)
		for (let c = 0; c < count; c++)
			if (qr.isDark(r, c))
				ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
}

/** Redraws the on-screen ticket as a flat PNG — same inked header, perforation and
 *  stub, so what gets saved to the camera roll is what was on screen. */
export function buildReceiptCard(receipt: ReceiptData): HTMLCanvasElement {
	const S = 2;                       // drawn at 2x so it stays sharp zoomed in
	const TW = 420, PAGE = 18;         // ticket width, white margin around it
	const W = TW + PAGE * 2;

	const INK = '#0b0b0f', PAPER = '#ffffff', SINK = '#f5f5f6';
	const INK40 = '#9a9a9e', INK60 = '#6b6b70', ACCENT = '#9333ea'; // keep in sync with --accent
	const mono = (px: number, w = 400) => `${w} ${px}px 'DM Mono', ui-monospace, monospace`;
	const disp = (px: number) => `800 ${px}px 'Archivo Expanded', 'Archivo', sans-serif`;

	// Its own QR, sized for print rather than reusing the 124px on-screen one.
	const stubQR = document.createElement('canvas');
	drawQR(stubQR, receipt.order_id, 132 * S);
	const qrW = stubQR.width / S;

	// Heights are fixed per block, so the canvas can be sized before anything is
	// drawn — the one place this layout has to agree with itself twice.
	const HEAD = 46;
	// ...+ 52 + ... is the bearer block: label at +10, name at +28, roll at +42.
	// It was 38 before the roll number was added; the perforation is drawn at
	// T + HEAD + BODY, so under-counting here tears straight through the roll.
	const BODY = 16 + 13 + 26 + 8 + receipt.items.length * 18 + 16 + 52 + 16;
	const STUB = 16 + Math.max(qrW, 96) + 16;
	const TH = HEAD + BODY + STUB;
	const H = PAGE + TH + PAGE + 26;

	const canvas = document.createElement('canvas');
	canvas.width = W * S; canvas.height = H * S;
	const ctx = canvas.getContext('2d')!;
	ctx.scale(S, S);
	ctx.textBaseline = 'alphabetic';

	ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);

	/* Canvas text neither wraps nor clips, so a long item or a long name would
	   simply be painted over the price beside it. Trim to fit instead. */
	const fit = (text: string, maxW: number) => {
		if (ctx.measureText(text).width <= maxW) return text;
		let t = text;
		while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
		return t + '…';
	};

	// ---- ticket body ----
	const L = PAGE, R = PAGE + TW, T = PAGE;
	ctx.fillStyle = SINK; ctx.fillRect(L, T, TW, TH);
	ctx.strokeStyle = INK; ctx.lineWidth = 2;
	ctx.strokeRect(L + 1, T + 1, TW - 2, TH - 2);

	// ---- inked header ----
	ctx.fillStyle = INK; ctx.fillRect(L, T, TW, HEAD);
	ctx.textAlign = 'left';
	ctx.fillStyle = PAPER; ctx.font = disp(15);
	ctx.fillText('ANVESHA', L + 16, T + 29);
	const bw = ctx.measureText('ANVESHA').width;
	ctx.fillStyle = ACCENT; ctx.font = disp(9);
	ctx.fillText("'26", L + 18 + bw, T + 22);
	ctx.textAlign = 'right';
	ctx.fillStyle = '#b9b9bd'; ctx.font = mono(9);
	ctx.fillText('COLLECTION PASS', R - 16, T + 29);

	// ---- counterfoil ----
	let y = T + HEAD + 16;
	ctx.textAlign = 'left';
	ctx.fillStyle = INK40; ctx.font = mono(9);
	ctx.fillText('ORDER NO.', L + 16, y + 9);
	y += 13;
	ctx.fillStyle = INK; ctx.font = mono(19, 500);
	ctx.fillText(receipt.order_id, L + 16, y + 19);
	y += 26 + 8;

	for (const it of receipt.items) {
		ctx.font = mono(11);
		const price = rupees(it.line_total_paise);
		const room = TW - 32 - ctx.measureText(price).width - 12;
		ctx.textAlign = 'left';
		ctx.fillStyle = INK60;
		ctx.fillText(
			fit(`${it.name}${it.size ? ' · ' + it.size : ''} × ${it.quantity}`, room),
			L + 16, y + 12);
		ctx.textAlign = 'right';
		ctx.fillStyle = INK;
		ctx.fillText(price, R - 16, y + 12);
		y += 18;
	}

	y += 10;
	ctx.strokeStyle = '#dcdcde'; ctx.lineWidth = 1.5;
	ctx.beginPath(); ctx.moveTo(L + 16, y); ctx.lineTo(R - 16, y); ctx.stroke();
	y += 6;

	ctx.textAlign = 'left';
	ctx.fillStyle = INK40; ctx.font = mono(9);
	ctx.fillText('BEARER', L + 16, y + 10);
	ctx.fillStyle = INK; ctx.font = disp(17);
	const totalW = ctx.measureText(rupees(receipt.total_price_paise)).width;
	ctx.font = mono(12);
	ctx.fillText(fit(receipt.name, TW - 32 - totalW - 16), L + 16, y + 28);
	// The roll sits under the name: it is what the counter types in when a student
	// turns up with no QR, so the pass has to show it back to them.
	ctx.fillStyle = INK40; ctx.font = mono(10);
	ctx.fillText(receipt.roll_number, L + 16, y + 42);
	ctx.fillStyle = INK;
	ctx.textAlign = 'right';
	ctx.fillStyle = INK40; ctx.font = mono(9);
	ctx.fillText('PAID', R - 16, y + 10);
	ctx.fillStyle = INK; ctx.font = disp(17);
	ctx.fillText(rupees(receipt.total_price_paise), R - 16, y + 29);

	// ---- perforation: dashed rule, then two paper-white discs punched over the
	//      side rules so the tear reads as a real notch ----
	const ripY = T + HEAD + BODY;
	ctx.strokeStyle = INK; ctx.lineWidth = 2;
	ctx.setLineDash([6, 5]);
	ctx.beginPath(); ctx.moveTo(L, ripY); ctx.lineTo(R, ripY); ctx.stroke();
	ctx.setLineDash([]);
	ctx.fillStyle = PAPER;
	for (const x of [L, R]) {
		ctx.beginPath(); ctx.arc(x, ripY, 8, 0, Math.PI * 2); ctx.fill();
	}

	// ---- stub ----
	const sy = ripY + 16;
	ctx.imageSmoothingEnabled = false; // integer module scale; never resample it
	ctx.drawImage(stubQR, L + 16, sy, qrW, qrW);
	ctx.strokeStyle = INK; ctx.lineWidth = 2;
	ctx.strokeRect(L + 15, sy - 1, qrW + 2, qrW + 2);

	const sx = L + 16 + qrW + 14;
	ctx.textAlign = 'left';
	ctx.fillStyle = INK40; ctx.font = mono(9);
	ctx.fillText('PRESENT AT COUNTER', sx, sy + 22);
	ctx.fillStyle = INK60; ctx.font = mono(11);
	ctx.fillText(receipt.transaction_id, sx, sy + 42);
	ctx.fillStyle = INK40; ctx.font = mono(9);
	ctx.fillText('▚▚ ANVESHA MERCH ▚▚', sx, sy + qrW - 4);

	ctx.fillStyle = INK40; ctx.font = "italic 10px 'Archivo', sans-serif";
	ctx.fillText('Show this at pickup — the QR is scanned once and marked collected.',
		PAGE, H - 12);

	return canvas;
}

/** `anvesha_order_20260818_024312.png` — local time, since the only person who
 *  reads this filename is the student whose phone it lands on. Colons and spaces
 *  are out: they are illegal in filenames on Windows and get mangled on Android. */
function receiptFilename(): string {
	const d = new Date();
	const p = (n: number) => String(n).padStart(2, '0');
	const stamp =
		`${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
		`_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
	return `anvesha_order_${stamp}.png`;
}

/** Renders the pass and hands it to the browser as a download.
 *
 *  A Blob URL rather than a data: URL — Safari refuses to download a data: URL
 *  above a few hundred KB, and this card is a full-bleed PNG. */
export async function saveReceipt(receipt: ReceiptData | null): Promise<void> {
	if (!receipt) return;
	await document.fonts.ready; // canvas text only renders correctly once webfonts are loaded
	const card = buildReceiptCard(receipt);
	const blob = await new Promise<Blob | null>((res) => card.toBlob(res, 'image/png'));
	if (!blob) return;

	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = receiptFilename();
	a.click();
	// Revoked on the next tick, not immediately: Safari reads the href
	// asynchronously and a URL revoked in the same frame downloads nothing.
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
