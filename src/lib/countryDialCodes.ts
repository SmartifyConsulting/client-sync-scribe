// Minimal country dial-code list focused on Holarc Health's target markets,
// with a long-tail fallback. Used by PhoneNumberInput.
export interface CountryDial {
  code: string;       // ISO 3166-1 alpha-2
  name: string;
  dial: string;       // e.g. "+27"
  flag: string;       // emoji flag
}

export const COUNTRY_DIAL_CODES: CountryDial[] = [
  { code: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦" },
  { code: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", dial: "+254", flag: "🇰🇪" },
  { code: "GH", name: "Ghana", dial: "+233", flag: "🇬🇭" },
  { code: "EG", name: "Egypt", dial: "+20", flag: "🇪🇬" },
  { code: "MA", name: "Morocco", dial: "+212", flag: "🇲🇦" },
  { code: "NA", name: "Namibia", dial: "+264", flag: "🇳🇦" },
  { code: "BW", name: "Botswana", dial: "+267", flag: "🇧🇼" },
  { code: "ZW", name: "Zimbabwe", dial: "+263", flag: "🇿🇼" },
  { code: "MZ", name: "Mozambique", dial: "+258", flag: "🇲🇿" },
  { code: "TZ", name: "Tanzania", dial: "+255", flag: "🇹🇿" },
  { code: "UG", name: "Uganda", dial: "+256", flag: "🇺🇬" },
  { code: "RW", name: "Rwanda", dial: "+250", flag: "🇷🇼" },
  { code: "ET", name: "Ethiopia", dial: "+251", flag: "🇪🇹" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { code: "IE", name: "Ireland", dial: "+353", flag: "🇮🇪" },
  { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { code: "NL", name: "Netherlands", dial: "+31", flag: "🇳🇱" },
  { code: "ES", name: "Spain", dial: "+34", flag: "🇪🇸" },
  { code: "IT", name: "Italy", dial: "+39", flag: "🇮🇹" },
  { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
  { code: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { code: "AE", name: "United Arab Emirates", dial: "+971", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦" },
];

export const DEFAULT_DIAL = "+27";

/**
 * Split an E.164 string into (dial, local) using our known prefixes.
 * Falls back to (DEFAULT_DIAL, raw) for unrecognised values.
 */
export function splitE164(value: string | null | undefined): { dial: string; local: string } {
  const v = (value || "").trim();
  if (!v) return { dial: DEFAULT_DIAL, local: "" };
  if (!v.startsWith("+")) return { dial: DEFAULT_DIAL, local: v.replace(/\D/g, "") };
  // longest dial first to avoid +1 swallowing +1xxx
  const dials = [...new Set(COUNTRY_DIAL_CODES.map((c) => c.dial))].sort((a, b) => b.length - a.length);
  for (const d of dials) {
    if (v.startsWith(d)) return { dial: d, local: v.slice(d.length).replace(/\D/g, "") };
  }
  return { dial: DEFAULT_DIAL, local: v.replace(/\D/g, "") };
}

export function joinE164(dial: string, local: string): string {
  const cleanLocal = (local || "").replace(/\D/g, "").replace(/^0+/, "");
  if (!cleanLocal) return "";
  return `${dial}${cleanLocal}`;
}
