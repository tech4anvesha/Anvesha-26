/**
 * The event types, and the icon each one renders with.
 *
 * One list, imported by both sides: the admin panel builds its Type dropdown from it
 * and the storefront builds its icon lookup from it. They used to be two hand-kept
 * copies — a type added to one simply drew the fallback calendar on the other.
 *
 * Icons are lucide, imported `?raw` so they can be inlined and inherit `currentColor`
 * rather than loading a sprite. The same icon can serve several types; a wrench means
 * "you will be making something" whether that is a workshop or a lab session.
 */
import iMic from 'lucide-static/icons/mic-vocal.svg?raw';
import iUsers from 'lucide-static/icons/users.svg?raw';
import iWrench from 'lucide-static/icons/wrench.svg?raw';
import iFlask from 'lucide-static/icons/flask-conical.svg?raw';
import iTrophy from 'lucide-static/icons/trophy.svg?raw';
import iBrain from 'lucide-static/icons/brain.svg?raw';
import iMap from 'lucide-static/icons/map.svg?raw';
import iCode from 'lucide-static/icons/code.svg?raw';
import iBot from 'lucide-static/icons/bot.svg?raw';
import iPuzzle from 'lucide-static/icons/puzzle.svg?raw';
import iAtom from 'lucide-static/icons/atom.svg?raw';
import iMicroscope from 'lucide-static/icons/microscope.svg?raw';
import iPalette from 'lucide-static/icons/palette.svg?raw';
import iTelescope from 'lucide-static/icons/telescope.svg?raw';
import iClapper from 'lucide-static/icons/clapperboard.svg?raw';
import iMusic from 'lucide-static/icons/music.svg?raw';
import iGamepad from 'lucide-static/icons/gamepad-2.svg?raw';
import iGlobe from 'lucide-static/icons/globe.svg?raw';
import iFootprints from 'lucide-static/icons/footprints.svg?raw';
import iPresentation from 'lucide-static/icons/presentation.svg?raw';
import iCalendar from 'lucide-static/icons/calendar-days.svg?raw';

export interface EventType {
	label: string;
	icon: string;
}

/** Dropdown order: what a session IS, then what it is FOR, then the fest furniture. */
export const EVENT_TYPES: EventType[] = [
	{ label: 'Talk', icon: iMic },
	{ label: 'Lecture', icon: iMic },
	{ label: 'Panel', icon: iUsers },
	{ label: 'Workshop', icon: iWrench },
	{ label: 'Lab Session', icon: iFlask },
	{ label: 'Demonstration', icon: iMicroscope },

	{ label: 'Competition', icon: iTrophy },
	{ label: 'Quiz', icon: iBrain },
	{ label: 'Treasure Hunt', icon: iMap },
	{ label: 'Puzzle Hunt', icon: iPuzzle },
	{ label: 'Hackathon', icon: iCode },
	{ label: 'Robotics', icon: iBot },
	{ label: 'Game', icon: iGamepad },

	{ label: 'Science Fest', icon: iAtom },
	{ label: 'Expo', icon: iMicroscope },
	{ label: 'Exhibition', icon: iPalette },
	{ label: 'Stargazing', icon: iTelescope },
	{ label: 'Field Trip', icon: iFootprints },
	{ label: 'Outreach', icon: iGlobe },

	{ label: 'Screening', icon: iClapper },
	{ label: 'Performance', icon: iMusic },
	{ label: 'Ceremony', icon: iPresentation },
	{ label: 'Other', icon: iCalendar },
];

/**
 * Lowercased matchers, most specific first — the first hit wins.
 *
 * Substring rather than exact, and with a few aliases the dropdown does not offer,
 * because the column is free text and rows predate the dropdown: 'Observation' and
 * 'Guest Talk' both exist in the database and neither is a label above. Exact matching
 * would draw a calendar for both.
 *
 * Order matters. 'lab session' has to be tested before 'lab', and 'treasure' before
 * 'hunt', or the shorter matcher swallows the longer one.
 */
export const TYPE_ICONS: [string, string][] = [
	['lab session', iFlask],
	['treasure', iMap],
	['puzzle', iPuzzle],
	['science fest', iAtom],
	['field trip', iFootprints],
	['stargaz', iTelescope],
	['observ', iTelescope],
	['telescope', iTelescope],
	['demonstrat', iMicroscope],
	['exhibit', iPalette],
	['workshop', iWrench],
	['competition', iTrophy],
	['hackathon', iCode],
	['robot', iBot],
	['quiz', iBrain],
	['panel', iUsers],
	['expo', iMicroscope],
	['screening', iClapper],
	['perform', iMusic],
	['music', iMusic],
	['game', iGamepad],
	['outreach', iGlobe],
	['ceremony', iPresentation],
	['prize', iPresentation],
	['talk', iMic],
	['lecture', iMic],
	['keynote', iMic],
	['lab', iFlask],
	['hunt', iMap],
];

/** Anything the matchers miss still gets a real icon, not an empty box. */
export const FALLBACK_ICON = iCalendar;
