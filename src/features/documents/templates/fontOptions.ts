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
