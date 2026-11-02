/**
 * Fills a ProjectFolder. One function for the popup on /projects and the preview on
 * /admin/expo, so the two can only ever show a project the same way.
 */
export interface FolderData {
	/** 'BIO-03', or whatever stands in for it before a project has a number. */
	code: string;
	/** The subject's icon, as the static SVG string from HALLS — never visitor input. */
	icon: string;
	subject: string;
	title: string;
	summary: string;
	team: string[];
	/** A URL, or null for the drawn camera frame. */
	image: string | null;
}

export function fillFolder(root: HTMLElement, d: FolderData) {
	const f = <T extends HTMLElement = HTMLElement>(name: string) =>
		root.querySelector(`[data-f="${name}"]`) as T;

	f('icon').innerHTML = d.icon;
	// textContent from here on: everything else is free text an admin typed.
	f('code').textContent = d.code;
	f('exhibit').textContent = d.code;
	f('subject').textContent = d.subject;
	f('title').textContent = d.title;
	f('summary').textContent = d.summary;
	f('count').textContent = String(d.team.length).padStart(2, '0');
	f('team').replaceChildren(...d.team.map((m) => {
		const li = document.createElement('li');
		li.textContent = m;
		return li;
	}));

	const media = f('media');
	const img = f<HTMLImageElement>('img');
	// A photo that fails falls back to the drawn frame rather than a broken-image box.
	img.onerror = () => media.classList.add('is-empty');
	media.classList.toggle('is-empty', !d.image);
	if (d.image) {
		if (img.getAttribute('src') !== d.image) img.src = d.image;
	} else {
		img.removeAttribute('src');
	}
}
