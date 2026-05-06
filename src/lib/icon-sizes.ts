/**
 * Iconography Scale — single source of truth for icon sizing.
 *
 * Use ONLY these tiers. Never write arbitrary `h-[Npx] w-[Npx]` for icons.
 *
 *   xs   (14px) — micro / inline metadata, dense table chips
 *   sm   (16px) — table actions, inline labels next to text-xs/text-sm, default button icons
 *   md   (20px) — buttons, form fields, list items, tab triggers (DEFAULT)
 *   lg   (24px) — card headers, status indicators, section icons
 *   xl   (32px) — empty states, major feature highlights
 *   hero (48px) — SOS / emergency / hero-only
 *
 * Alignment rule: when an icon sits beside text, the parent must use
 * `inline-flex items-center gap-1.5` (sm) or `gap-2` (md+).
 *
 * Style rule: lucide-react only. No mixing icon families.
 */
export const ICON = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
  hero: "h-12 w-12",
} as const;

export type IconSize = keyof typeof ICON;
