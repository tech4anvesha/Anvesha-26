/**
 * The Expo's subjects and their projects — read by /expo (the six cards) and by
 * /projects (every subject's projects, one tab each). One array, so a subject added
 * here gets a card and a tab with no markup change.
 */
import iDna from 'lucide-static/icons/dna.svg?raw';
import iAtom from 'lucide-static/icons/atom.svg?raw';
import iFlask from 'lucide-static/icons/flask-conical.svg?raw';
import iSigma from 'lucide-static/icons/sigma.svg?raw';
import iCpu from 'lucide-static/icons/cpu.svg?raw';
import iGlobe from 'lucide-static/icons/globe-2.svg?raw';

export interface Project {
	title: string;
	summary: string;
	team: string[];
	/** Under /public. Optional: a project with no photo yet gets a drawn frame. */
	image?: string;
}

export interface Hall {
	/** Stable id for the subject's tab and its panel on /projects. */
	slug: string;
	name: string;
	/** Tab label when the name is too long for one, e.g. EESS. */
	short?: string;
	icon: string;
	/** Last year's project count, shown on the card. */
	n: number;
	blurb: string;
	leads: string[];
	projects: Project[];
}

// ============================================================
// PLACEHOLDER PROJECTS — swap the copy, keep the shape.
// Titles, summaries and teams below are scaffolding, not real entries. The images are
// last year's floor photos, standing in until each team sends its own.
// ============================================================
const shot = (n: number) => `/img/expo/expo${String(n).padStart(2, '0')}.jpg`;

export const HALLS: Hall[] = [
	{
		slug: 'biology', name: 'Biology', icon: iDna, n: 12,
		blurb: 'Botany through to neurobiology — living systems taken apart on the table, from tissue under a microscope to whole-organism behaviour.',
		leads: ['Sarbajit Pathak', 'Ankita Acharya', 'Gargi Datta'],
		projects: [
			{ title: 'Project title', summary: 'One or two sentences on what the project does and what a visitor will see at the table.', team: ['Member One', 'Member Two', 'Member Three'], image: shot(1) },
			{ title: 'Project title', summary: 'One or two sentences on what the project does and what a visitor will see at the table.', team: ['Member One', 'Member Two'], image: shot(2) },
		],
	},
	{
		slug: 'physics', name: 'Physics', icon: iAtom, n: 18,
		blurb: 'Fluids, plasmas and quantum mechanics, mostly as apparatus you are meant to set going yourself rather than read about.',
		leads: ['Akshara Somala Raju', 'Sambit Dutta', 'Pranav Guptta'],
		projects: [
			{ title: 'Project title', summary: 'One or two sentences on what the project does and what a visitor will see at the table.', team: ['Member One', 'Member Two', 'Member Three'], image: shot(3) },
			{ title: 'Project title', summary: 'One or two sentences on what the project does and what a visitor will see at the table.', team: ['Member One'], image: shot(4) },
		],
	},
	{
		slug: 'chemistry', name: 'Chemistry', icon: iFlask, n: 8,
		blurb: 'Synthesis, crystals and polymers — the bench chemistry that has to be watched happening to make any sense.',
		leads: ['Mahalakshmi M', 'Pavithra Praveen', 'Aditya Katti'],
		projects: [
			{ title: 'Project title', summary: 'One or two sentences on what the project does and what a visitor will see at the table.', team: ['Member One', 'Member Two'], image: shot(5) },
		],
	},
	{
		slug: 'mathematics', name: 'Mathematics', icon: iSigma, n: 12,
		blurb: 'Knots, number theory and dynamical systems, built into objects you can turn over in your hands.',
		leads: ['Akash N', 'Arpan Koul', 'Joel Jobby Jacob'],
		projects: [
			{ title: 'Project title', summary: 'One or two sentences on what the project does and what a visitor will see at the table.', team: ['Member One', 'Member Two', 'Member Three'], image: shot(6) },
			{ title: 'Project title', summary: 'One or two sentences on what the project does and what a visitor will see at the table.', team: ['Member One', 'Member Two'] },
		],
	},
	{
		slug: 'data-science', name: 'Data Science', icon: iCpu, n: 13,
		blurb: 'Vision models, robots and signal processing, running live on hardware small enough to carry to a table.',
		leads: ['Saurabh Kumar Singh'],
		projects: [
			{ title: 'Project title', summary: 'One or two sentences on what the project does and what a visitor will see at the table.', team: ['Member One', 'Member Two'], image: shot(7) },
			{ title: 'Project title', summary: 'One or two sentences on what the project does and what a visitor will see at the table.', team: ['Member One', 'Member Two', 'Member Three', 'Member Four'], image: shot(8) },
		],
	},
	{
		slug: 'eess', name: 'Earth, Environmental & Sustainability Sciences', short: 'EESS', icon: iGlobe, n: 9,
		blurb: 'Oceans, atmosphere and the carbon cycle — the planet at whatever scale a table can hold.',
		leads: ['Sonavane Samiksha Nilesh', 'Maheen Rituraj Buddhisagar'],
		projects: [
			{ title: 'Project title', summary: 'One or two sentences on what the project does and what a visitor will see at the table.', team: ['Member One', 'Member Two'], image: shot(9) },
		],
	},
];
