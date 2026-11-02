/**
 * The Expo's subjects — read by /expo (the six cards), /projects (one tab each) and
 * /admin/expo (the subject dropdown). The projects themselves live in the database,
 * behind the events Worker's /api/projects.
 */
import iDna from 'lucide-static/icons/dna.svg?raw';
import iAtom from 'lucide-static/icons/atom.svg?raw';
import iFlask from 'lucide-static/icons/flask-conical.svg?raw';
import iSigma from 'lucide-static/icons/sigma.svg?raw';
import iCpu from 'lucide-static/icons/cpu.svg?raw';
import iGlobe from 'lucide-static/icons/globe-2.svg?raw';

/** One project as /api/projects returns it. */
export interface Project {
	project_id: number;
	/** The subject's `code` below. */
	subject: string;
	project_no: number;
	title: string;
	description: string;
	team: string[];
	has_image: boolean;
	/** When the row last changed — goes on the image URL so a new photo is a new URL. */
	v: string;
}

/** BIO + 3 -> 'BIO-03', the exhibit's name on the floor. */
export const projectCode = (subject: string, no: number) => `${subject}-${String(no).padStart(2, '0')}`;

export interface Hall {
	/** Stable id for the subject's tab and its panel on /projects. */
	slug: string;
	/** Three letters, as the database stores it and the floor prints it (BIO-01). Must
	 *  match SUBJECTS in worker-events/src/index.ts. */
	code: string;
	name: string;
	/** Tab label when the name is too long for one, e.g. EESS. */
	short?: string;
	icon: string;
	/** Last year's project count, shown on the card. */
	n: number;
	blurb: string;
	leads: string[];
}

export const HALLS: Hall[] = [
	{
		slug: 'biology', code: 'BIO', name: 'Biology', icon: iDna, n: 12,
		blurb: 'Botany through to neurobiology — living systems taken apart on the table, from tissue under a microscope to whole-organism behaviour.',
		leads: ['Sarbajit Pathak', 'Ankita Acharya', 'Gargi Datta'],
	},
	{
		slug: 'physics', code: 'PHY', name: 'Physics', icon: iAtom, n: 18,
		blurb: 'Fluids, plasmas and quantum mechanics, mostly as apparatus you are meant to set going yourself rather than read about.',
		leads: ['Akshara Somala Raju', 'Sambit Dutta', 'Pranav Guptta'],
	},
	{
		slug: 'chemistry', code: 'CHE', name: 'Chemistry', icon: iFlask, n: 8,
		blurb: 'Synthesis, crystals and polymers — the bench chemistry that has to be watched happening to make any sense.',
		leads: ['Mahalakshmi M', 'Pavithra Praveen', 'Aditya Katti'],
	},
	{
		slug: 'mathematics', code: 'MAT', name: 'Mathematics', icon: iSigma, n: 12,
		blurb: 'Knots, number theory and dynamical systems, built into objects you can turn over in your hands.',
		leads: ['Akash N', 'Arpan Koul', 'Joel Jobby Jacob'],
	},
	{
		slug: 'data-science', code: 'DAT', name: 'Data Science', icon: iCpu, n: 13,
		blurb: 'Vision models, robots and signal processing, running live on hardware small enough to carry to a table.',
		leads: ['Saurabh Kumar Singh'],
	},
	{
		slug: 'eess', code: 'EES', name: 'Earth, Environmental & Sustainability Sciences', short: 'EESS', icon: iGlobe, n: 9,
		blurb: 'Oceans, atmosphere and the carbon cycle — the planet at whatever scale a table can hold.',
		leads: ['Sonavane Samiksha Nilesh', 'Maheen Rituraj Buddhisagar'],
	},
];
