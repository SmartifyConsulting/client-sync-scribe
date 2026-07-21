import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import af from "./locales/af.json";
import zu from "./locales/zu.json";
import xh from "./locales/xh.json";
import sn from "./locales/sn.json";
import sw from "./locales/sw.json";
import ha from "./locales/ha.json";
import ig from "./locales/ig.json";
import yo from "./locales/yo.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import es from "./locales/es.json";
import pt from "./locales/pt.json";
import it from "./locales/it.json";
import nl from "./locales/nl.json";
import el from "./locales/el.json";
import pl from "./locales/pl.json";
import ru from "./locales/ru.json";
import tr from "./locales/tr.json";
import hi from "./locales/hi.json";
import zh from "./locales/zh.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import ar from "./locales/ar.json";
import he from "./locales/he.json";
import { mergeTranslations, uiTranslations } from "./uiTranslations";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "af", name: "Afrikaans", flag: "🇿🇦" },
  { code: "zu", name: "isiZulu", flag: "🇿🇦" },
  { code: "xh", name: "isiXhosa", flag: "🇿🇦" },
  { code: "sn", name: "Shona", flag: "🇿🇼" },
  { code: "sw", name: "Kiswahili", flag: "🇰🇪" },
  { code: "ha", name: "Hausa", flag: "🇳🇬" },
  { code: "ig", name: "Igbo", flag: "🇳🇬" },
  { code: "yo", name: "Yorùbá", flag: "🇳🇬" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "he", name: "עברית", flag: "🇮🇱" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "el", name: "Ελληνικά", flag: "🇬🇷" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const RTL_LANGS = new Set(["ar", "he", "ur", "fa"]);

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: mergeTranslations(uiTranslations.en, en) },
      af: { translation: mergeTranslations(uiTranslations.en, af) },
      zu: { translation: mergeTranslations(uiTranslations.en, zu) },
      xh: { translation: mergeTranslations(uiTranslations.en, xh) },
      sn: { translation: mergeTranslations(uiTranslations.en, sn) },
      sw: { translation: mergeTranslations(uiTranslations.en, sw) },
      ha: { translation: mergeTranslations(uiTranslations.en, ha) },
      ig: { translation: mergeTranslations(uiTranslations.en, ig) },
      yo: { translation: mergeTranslations(uiTranslations.en, yo) },
      ar: { translation: mergeTranslations(uiTranslations.en, ar) },
      he: { translation: mergeTranslations(uiTranslations.en, he) },
      fr: { translation: mergeTranslations(mergeTranslations(uiTranslations.en, fr), uiTranslations.fr) },
      de: { translation: mergeTranslations(uiTranslations.en, de) },
      es: { translation: mergeTranslations(uiTranslations.en, es) },
      pt: { translation: mergeTranslations(uiTranslations.en, pt) },
      it: { translation: mergeTranslations(uiTranslations.en, it) },
      nl: { translation: mergeTranslations(uiTranslations.en, nl) },
      el: { translation: mergeTranslations(mergeTranslations(uiTranslations.en, el), uiTranslations.el) },
      pl: { translation: mergeTranslations(uiTranslations.en, pl) },
      ru: { translation: mergeTranslations(uiTranslations.en, ru) },
      tr: { translation: mergeTranslations(uiTranslations.en, tr) },
      hi: { translation: mergeTranslations(uiTranslations.en, hi) },
      zh: { translation: mergeTranslations(uiTranslations.en, zh) },
      ja: { translation: mergeTranslations(uiTranslations.en, ja) },
      ko: { translation: mergeTranslations(uiTranslations.en, ko) },
    },
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage"],
      lookupLocalStorage: "app.language",
      caches: ["localStorage"],
    },

  });

const LANG_SCALE: Record<string, number> = {
  de: 0.94, nl: 0.94, ru: 0.94, el: 0.94, pl: 0.94, tr: 0.94, fr: 0.94, pt: 0.94, it: 0.94,
  ha: 0.96, ig: 0.96, yo: 0.96, sw: 0.96, sn: 0.96, zu: 0.96, xh: 0.96, af: 0.96,
  zh: 1.02, ja: 1.02, ko: 1.02,
};

const applyLang = (lng: string) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dir = RTL_LANGS.has(lng) ? "rtl" : "ltr";
  root.lang = lng;
  root.style.setProperty("--lang-scale", String(LANG_SCALE[lng] ?? 1));
};
applyLang(i18n.language || "en");
i18n.on("languageChanged", applyLang);


export default i18n;
