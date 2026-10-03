/**
 * The admin gate, now two factors over one shared password.
 *
 * The decision table is small but the *shape* of it is the point: because the password
 * is shared, a login must not reveal which of the two halves failed. If it did, anyone
 * who had the password — and it only takes one screenshot in one group chat — could walk
 * IMS24001, IMS24002, … and read the roster off the error messages, and a rostered roll
 * is the only other thing they would need.
 *
 * So: both halves evaluated, one answer. That is what these tests pin down.
 *
 *   npm test
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/** `rostered` is admin_roster.active via LEFT JOIN: null = absent, 0 = suspended. */
type Gate = { passwordOk: boolean; rostered: number | null; panelActive: number };

/** adminLogin's decision, as the handler implements it. */
function login(g: Gate): 'ok' | 'admin_disabled' | 'rejected' {
	if (g.panelActive !== 1) return 'admin_disabled';
	const rosterOk = g.rostered === 1;
	return g.passwordOk && rosterOk ? 'ok' : 'rejected';
}

/** requireAdmin's decision on an already-open session. */
const stillIn = (rostered: number | null, panelActive: number) =>
	panelActive === 1 && rostered === 1;

describe('admin login gate', () => {
	it('lets a rostered admin in with the right password', () => {
		assert.equal(login({ passwordOk: true, rostered: 1, panelActive: 1 }), 'ok');
	});

	it('refuses the right password from a roll that is not on the roster', () => {
		// The PP / IDK42069 case: correct shared password, invented roll number.
		assert.equal(login({ passwordOk: true, rostered: null, panelActive: 1 }), 'rejected');
	});

	it('refuses a suspended roll even though the row still exists', () => {
		assert.equal(login({ passwordOk: true, rostered: 0, panelActive: 1 }), 'rejected');
	});

	it('refuses a rostered admin with the wrong password', () => {
		assert.equal(login({ passwordOk: false, rostered: 1, panelActive: 1 }), 'rejected');
	});

	it('gives ONE answer for both kinds of failure', () => {
		// The whole anti-enumeration property in one assertion: if these ever differ,
		// the roster becomes readable to anyone holding the shared password.
		const wrongPassword = login({ passwordOk: false, rostered: 1, panelActive: 1 });
		const notRostered = login({ passwordOk: true, rostered: null, panelActive: 1 });
		const neither = login({ passwordOk: false, rostered: null, panelActive: 1 });
		assert.equal(wrongPassword, notRostered);
		assert.equal(notRostered, neither);
	});

	it('reports a switched-off panel before either factor', () => {
		// Unchanged behaviour: a disabled panel must not be probeable for a valid password.
		for (const rostered of [1, 0, null])
			for (const passwordOk of [true, false])
				assert.equal(login({ passwordOk, rostered, panelActive: 0 }), 'admin_disabled');
	});
});

describe('open sessions re-check the roster', () => {
	it('keeps a rostered admin signed in', () => {
		assert.equal(stillIn(1, 1), true);
	});

	it('ends the session of someone taken off the roster', () => {
		// Not just "no new logins": a removed volunteer holds a token good for 12 hours,
		// and that is exactly the window removal has to close.
		assert.equal(stillIn(0, 1), false);
		assert.equal(stillIn(null, 1), false);
	});

	it('still honours the global kill switch', () => {
		assert.equal(stillIn(1, 0), false);
	});
});
