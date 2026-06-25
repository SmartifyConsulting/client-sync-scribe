/**
 * Helpers for passing the user's LOCAL calendar date + timezone to AI edge
 * functions, so relative date parsing ("today", "Monday", "3 July") stays
 * anchored to the user's calendar rather than UTC.
 */

export function getClientDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getClientTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function clientDateContext() {
  return { clientDate: getClientDate(), clientTimezone: getClientTimezone() };
}
