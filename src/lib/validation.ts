// Shared validation helpers.
// RFC-lite email check — fast and good enough for UI-level validation.
// Server-side validation should still happen for any persisted email.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string | null | undefined): boolean {
  const v = (value || "").trim();
  if (!v) return false;
  if (v.length > 254) return false;
  return EMAIL_REGEX.test(v);
}

/** Returns true for empty OR valid email. Use in optional-email fields. */
export function isValidOptionalEmail(value: string | null | undefined): boolean {
  const v = (value || "").trim();
  if (!v) return true;
  return isValidEmail(v);
}
