import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import af from "./locales/af.json";
import zu from "./locales/zu.json";
import xh from "./locales/xh.json";
import ha from "./locales/ha.json";
import ig from "./locales/ig.json";
import yo from "./locales/yo.json";
import fr from "./locales/fr.json";
import pt from "./locales/pt.json";
import es from "./locales/es.json";
import ar from "./locales/ar.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "af", name: "Afrikaans", flag: "🇿🇦" },
  { code: "zu", name: "isiZulu", flag: "🇿🇦" },
  { code: "xh", name: "isiXhosa", flag: "🇿🇦" },
  { code: "ha", name: "Hausa", flag: "🇳🇬" },
  { code: "ig", name: "Igbo", flag: "🇳🇬" },
  { code: "yo", name: "Yoruba", flag: "🇳🇬" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      af: { translation: af },
      zu: { translation: zu },
      xh: { translation: xh },
      ha: { translation: ha },
      ig: { translation: ig },
      yo: { translation: yo },
      fr: { translation: fr },
      pt: { translation: pt },
      es: { translation: es },
      ar: { translation: ar },
    },
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "app.language",
      caches: ["localStorage"],
    },
  });

// Apply RTL direction for Arabic
const applyDir = (lng: string) => {
  if (typeof document !== "undefined") {
    document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lng;
  }
};
applyDir(i18n.language || "en");
i18n.on("languageChanged", applyDir);

export default i18n;
