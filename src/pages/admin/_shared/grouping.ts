export const COUNTRY_FLAGS: Record<string, string> = {
  "South Africa": "🇿🇦", ZA: "🇿🇦", RSA: "🇿🇦",
  Nigeria: "🇳🇬", NG: "🇳🇬",
};

export const COUNTRY_PINS = ["South Africa", "Nigeria"];

export function normalizeCountry(c: string | null | undefined) {
  if (!c) return "Unknown";
  const t = c.trim();
  if (/^(za|rsa|south africa)$/i.test(t)) return "South Africa";
  if (/^(ng|nigeria)$/i.test(t)) return "Nigeria";
  return t;
}

export function groupByCountry<T>(rows: T[], getCountry: (r: T) => string | null | undefined) {
  const out: Record<string, T[]> = {};
  for (const r of rows) {
    const c = normalizeCountry(getCountry(r));
    (out[c] ||= []).push(r);
  }
  return out;
}

export function sortedCountries(grouped: Record<string, unknown>) {
  const keys = Object.keys(grouped);
  const pinned = COUNTRY_PINS.filter((c) => keys.includes(c));
  const rest = keys.filter((c) => !pinned.includes(c)).sort();
  return [...pinned, ...rest];
}

export const countryFlag = (country: string) => COUNTRY_FLAGS[country] ?? "🌍";
