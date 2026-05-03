/** Digits only (strips spaces, dashes, +, parentheses). */
export function phoneDigitsOnly(raw: string): string {
  return raw.replace(/\D/g, "")
}

const MIN_DIGITS = 7
const MAX_DIGITS = 15

/**
 * Booking contact phone: lenient international (Grand Cayman and visitors).
 * Requires 7–15 digits; rejects obvious junk (all one repeated digit).
 */
export function validateBookingPhone(
  raw: string,
): { ok: true; digits: string } | { ok: false; message: string } {
  const digits = phoneDigitsOnly(raw)
  if (digits.length < MIN_DIGITS) {
    return {
      ok: false,
      message: `Enter a phone number with at least ${MIN_DIGITS} digits — for example 345-927-7227 or +1 345 927 7227.`,
    }
  }
  if (digits.length > MAX_DIGITS) {
    return {
      ok: false,
      message: "That phone number looks too long. Check for typos or extra characters.",
    }
  }
  if (/^(\d)\1{6,}$/.test(digits)) {
    return { ok: false, message: "Please enter a real contact number." }
  }
  return { ok: true, digits }
}
