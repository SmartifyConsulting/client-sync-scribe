import fs from 'fs';

const remainingTranslations = {
  "landing.mobile.appStore": "App Store",
  "landing.mobile.googlePlay": "Google Play",
  "landing.trustStrip.patientAccess": "Patient-granted access",
  "landing.trustStrip.collaboration": "Real-time collaboration",
  "landing.trustStrip.patientCentric": "Built around the patient",
  "landing.features.transcribedSessions": "Transcribed Sessions",
  "landing.features.transcribedDescription": "Voice transcribed in real time. AI extracts diagnoses, prescriptions and follow-up tasks automatically.",
  "landing.features.medicationAdherence": "Medication Adherence",
  "landing.features.medicationDescription": "Verified ingestion. Confidence scored. Provisional doses auto-approved monthly.",
  "landing.features.rewardsEarned": "+5 Rewards earned",
  "landing.features.roundTable": "Round Table",
  "landing.features.roundTableDescription": "Specialists coordinate per patient with shared notes and read-receipts.",
  "landing.features.aiAssistant": "AI Clinical Assistant",
  "landing.features.aiAssistantDescription": "Patient history summaries · medication conflict alerts · imaging analysis · auto-generated documents.",
  "landing.features.holarcHelp": "Holarc Help (SOS)",
  "landing.features.holarcHelpDescription": "One-tap dispatch to nearby emergency responders and hospitals with live location, ETA tracking, and full medical context shared on arrival.",
  "landing.features.emergencyResponders": "Emergency responders",
  "landing.features.hospitals": "Hospitals",
  "landing.features.bloodBanks": "Blood banks",
};

const languages = ['en', 'af', 'zu', 'xh', 'sn', 'sw', 'ha', 'ig', 'ar', 'de', 'el', 'es', 'fr', 'he', 'hi', 'it', 'ja', 'ko', 'nl', 'pl', 'pt', 'ru', 'tr', 'yo', 'zh'];

for (const lang of languages) {
  const filepath = `src/i18n/locales/${lang}.json`;
  const json = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  
  // Add remaining keys
  for (const [key, value] of Object.entries(remainingTranslations)) {
    const keys = key.split('.');
    let current = json;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }
  
  fs.writeFileSync(filepath, JSON.stringify(json, null, 2) + '\n');
  console.log(`✓ Added remaining translations to ${lang}.json`);
}

console.log('\n✅ All remaining translations added to 25 language files');
