import fs from "fs";
import path from "path";

// Read the English translation file
const enPath = "src/i18n/locales/en.json";
const en = JSON.parse(fs.readFileSync(enPath, "utf-8"));

// List of all languages except English
const languages = [
  "af", "ar", "de", "el", "es", "fr", "ha", "he", "hi", "ig", "it", "ja", 
  "ko", "nl", "pl", "pt", "ru", "sn", "sw", "tr", "xh", "yo", "zh", "zu"
];

// For each language, read existing file and merge in new keys
languages.forEach((lang) => {
  const langPath = `src/i18n/locales/${lang}.json`;
  let langData = {};
  
  // Read existing file if it exists
  if (fs.existsSync(langPath)) {
    try {
      langData = JSON.parse(fs.readFileSync(langPath, "utf-8"));
    } catch (e) {
      console.error(`Error reading ${langPath}:`, e.message);
    }
  }
  
  // Deep merge: keep existing translations, add new keys with English fallback
  function mergeKeys(target, source) {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === "object" && source[key] !== null && !Array.isArray(source[key])) {
          if (!target[key] || typeof target[key] !== "object") {
            target[key] = {};
          }
          mergeKeys(target[key], source[key]);
        } else {
          // Keep existing translation, or use English as fallback
          if (!target.hasOwnProperty(key)) {
            target[key] = source[key];
          }
        }
      }
    }
  }
  
  mergeKeys(langData, en);
  
  // Write back
  fs.writeFileSync(langPath, JSON.stringify(langData, null, 4));
  console.log(`Updated ${langPath}`);
});

console.log(`Skeleton translations generated for ${languages.length} languages`);
