// Returns a public tracking URL that avoids the lovableproject.com preview origin
// (which requires Lovable auth/has restricted Google Maps key access for recipients).
const PUBLISHED_ORIGINS = [
  "https://holarchealth.com",
  "https://www.holarchealth.com",
  "https://medpad.lovable.app",
];
const DEFAULT_PUBLISHED_ORIGIN = "https://medpad.lovable.app";

export function getPublicTrackUrl(token: string): string {
  if (typeof window === "undefined") return `${DEFAULT_PUBLISHED_ORIGIN}/track/${token}`;
  const origin = window.location.origin;
  if (PUBLISHED_ORIGINS.includes(origin)) return `${origin}/track/${token}`;
  return `${DEFAULT_PUBLISHED_ORIGIN}/track/${token}`;
}
