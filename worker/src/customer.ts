/**
 * Buyer details captured at the counter, in place of a payment gateway.
 *
 * Pure and separately tested: this is the only thing standing between a typo and a
 * student who cannot be contacted about their order.
 */

import { bad } from './util.ts';

export interface Customer {
	name: string;
	phone: string;
	email: string;
}

/**
 * Validates and NORMALISES. Returns the cleaned values rather than a boolean, so the
 * caller cannot accidentally store the raw input after a successful check.
 */
export function parseCustomer(body: unknown): Customer {
	const b = (body ?? {}) as Record<string, unknown>;

	const name = String(b.name ?? '').trim().replace(/\s+/g, ' ');
	if (name.length < 2 || name.length > 80) throw bad('bad_name', 'Name must be 2 to 80 characters');

	// Strip spaces, dashes and a +91 prefix, then require a 10-digit Indian mobile.
	// Normalising first means "+91 98765 43210" and "9876543210" are stored identically
	// and cannot become two different-looking records for one person.
	const rawPhone = String(b.phone ?? '').replace(/[\s-]/g, '');
	const phone = rawPhone.replace(/^(\+91|0091|91(?=\d{10}$)|0)/, '');
	if (!/^[6-9]\d{9}$/.test(phone))
		throw bad('bad_phone', 'Enter a 10-digit Indian mobile number');

	// Only the college domain is accepted — this is a fest for IISER TVM, and the email
	// is how a disputed order gets tracked back to a real student.
	const email = String(b.email ?? '').trim().toLowerCase();
	if (email.length > 120 || !/^[^\s@]+@iisertvm\.ac\.in$/.test(email))
		throw bad('bad_email', 'Enter your @iisertvm.ac.in email address');

	return { name, phone, email };
}
