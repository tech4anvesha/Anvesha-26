/**
 * Sampling a rendered wordmark into particle coordinates.
 *
 * Shared by the home page's intro (bar -> hero) and the shell's return flight
 * (hero -> bar), so both measure type by identical rules and can hand positions
 * to each other across a client-side navigation.
 */

/**
 * Render `str` in `el`'s own font at `el`'s own size to an offscreen canvas and return
 * the coordinates of its ink, in that box's local space, plus the box itself.
 *
 * Shared by both wordmarks so the bar and the hero are sampled by identical rules —
 * the only difference between them is the computed style they carry.
 */
export function sampleInk(el: HTMLElement, str: string, step: number) {
	const rect = el.getBoundingClientRect();
	const w = Math.ceil(rect.width);
	const h = Math.ceil(rect.height);
	if (w < 2 || h < 2) return null;

	const cs = getComputedStyle(el);
	const off = document.createElement('canvas');
	off.width = w;
	off.height = h;
	const octx = off.getContext('2d', { willReadFrequently: true });
	if (!octx) return null;

	octx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
	// Not supported everywhere; without it the sampled word is fractionally wider than
	// the DOM one, which the cross-fade absorbs.
	try { octx.letterSpacing = cs.letterSpacing; } catch { /* older browsers */ }
	octx.textAlign = 'center';
	octx.fillStyle = '#000';

	// Put the canvas baseline exactly where CSS puts the DOM one, rather than eyeballing
	// it with textBaseline:'middle' — that centres the em square, which is not where a
	// browser draws. CSS centres the font's content area (ascent + descent) inside the
	// line box and sets the baseline one half-leading plus one ascent down from the top.
	// Same arithmetic here, off the same font metrics, so the dust lands on the type
	// instead of a couple of pixels above it.
	const m = octx.measureText(str);
	const fa = m.fontBoundingBoxAscent;
	const fd = m.fontBoundingBoxDescent;
	if (typeof fa === 'number' && typeof fd === 'number') {
		octx.textBaseline = 'alphabetic';
		octx.fillText(str, w / 2, (h - (fa + fd)) / 2 + fa);
	} else {
		// Pre-2022 Safari has no font metrics. ANVESHA is all caps with no descenders,
		// so centring the em square is close, and the cross-fade absorbs the rest.
		octx.textBaseline = 'middle';
		octx.fillText(str, w / 2, h / 2);
	}

	let pixels: Uint8ClampedArray;
	try {
		pixels = octx.getImageData(0, 0, w, h).data;
	} catch {
		return null; // tainted or zero-sized canvas — nothing to sample
	}

	const pts: number[][] = [];
	for (let y = 0; y < h; y += step) {
		for (let x = 0; x < w; x += step) {
			// Alpha only: the offscreen word is solid black on transparent.
			if (pixels[(y * w + x) * 4 + 3] > 128) pts.push([x, y]);
		}
	}
	return pts.length ? { pts, rect, w, h } : null;
}
