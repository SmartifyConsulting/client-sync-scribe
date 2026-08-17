/**
 * Recipient greetings for letters and emails.
 * Never "Dear Colleague" — a generic greeting reads like a phishing attempt.
 */

export function buildGreeting(opts: {
  fullName?: string | null;
  isPractitioner?: boolean;
  organisationName?: string | null;
}): string {
  const raw = (opts.fullName || "").trim();
  if (raw) {
    const cleaned = raw.replace(/^(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?)\s+/i, "").trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length) {
      return opts.isPractitioner
        ? `Dear Dr ${parts[parts.length - 1]}`
        : `Dear ${parts[0]}`;
    }
  }
  const org = (opts.organisationName || "").trim();
  if (org) return `Dear ${org} team`;
  return "Dear Doctor";
}
