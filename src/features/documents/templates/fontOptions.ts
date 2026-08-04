export const FONT_OPTIONS = [
  { value: "sans", label: "DM Sans (Default)", preview: "font-sans" },
  { value: "roboto", label: "Roboto", preview: "font-roboto" },
  { value: "open-sans", label: "Open Sans", preview: "font-open-sans" },
  { value: "lora", label: "Lora", preview: "font-lora" },
  { value: "merriweather", label: "Merriweather", preview: "font-merriweather" },
  { value: "playfair", label: "Playfair Display", preview: "font-playfair" },
  { value: "source-serif", label: "Source Serif", preview: "font-source-serif" },
  { value: "rockwell", label: "Rockwell", preview: "font-rockwell" },
  { value: "poppins", label: "Poppins", preview: "font-poppins" },
  { value: "montserrat", label: "Montserrat", preview: "font-montserrat" },
  { value: "nunito", label: "Nunito", preview: "font-nunito" },
  { value: "raleway", label: "Raleway", preview: "font-raleway" },
];

export function getFontClass(fontValue: string | null | undefined): string {
  return FONT_OPTIONS.find((f) => f.value === fontValue)?.preview || "font-sans";
}

/**
 * CSS font-family stacks matching tailwind.config.ts `theme.extend.fontFamily`
 * 1:1, so any surface using inline styles (print output, the WYSIWYG editor)
 * renders the exact same typeface as surfaces using the Tailwind `font-*`
 * classes (e.g. the Content Preview panel). Keep these two in sync.
 */
const FONT_FAMILY_CSS: Record<string, string> = {
  sans: "'Manrope Variable', Manrope, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  roboto: "Roboto, sans-serif",
  "open-sans": "'Open Sans', sans-serif",
  lora: "Lora, serif",
  merriweather: "Merriweather, serif",
  playfair: "'Playfair Display', serif",
  "source-serif": "'Source Serif 4', serif",
  rockwell: "Rockwell, Georgia, serif",
  poppins: "Poppins, sans-serif",
  montserrat: "Montserrat, sans-serif",
  nunito: "Nunito, sans-serif",
  raleway: "Raleway, sans-serif",
};

export function getFontFamilyCss(fontValue: string | null | undefined): string {
  return (fontValue && FONT_FAMILY_CSS[fontValue]) || FONT_FAMILY_CSS.sans;
}
