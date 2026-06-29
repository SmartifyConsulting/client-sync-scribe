import fs from 'fs';

const landingTranslations = {
  "landing": {
    "nav": {
      "login": "Login",
      "getStarted": "Get Started"
    },
    "hero": {
      "badge": "AI-powered · Patient-controlled · HIPAA-aligned",
      "title": "A revolutionary healthcare ecosystem",
      "titleHighlight": "built around you.",
      "description": "Holarc is one connected platform where doctors run their entire practice and patients own their entire 360° health story — from voice-recorded consultations and AI summaries, to video-verified medication adherence rewards, cross-specialist Round Tables, hospital admissions, prescriptions, billing, and a unified care calendar.",
      "cta": "Join the Ecosystem",
      "doctorsButton": "Doctors",
      "patientsButton": "Patients"
    },
    "capabilities": {
      "voiceConsultations": "Voice Consultations",
      "aiSummaries": "AI Summaries",
      "incentivizedAdherence": "Incentivized Adherence",
      "rewards": "Rewards",
      "roundTable": "Round Table",
      "prescriptions": "Prescriptions",
      "hospitalAdmissions": "Hospital Admissions",
      "autoTasks": "Auto-Tasks",
      "unifiedCalendar": "Unified Calendar",
      "emergencySOS": "Emergency SOS",
      "emergencyResponseDispatch": "Emergency Response Dispatch",
      "hospitalNetwork": "Hospital Network"
    },
    "mobile": {
      "title": "Get Holarc on your phone",
      "description": "Available on iOS and Android — your full health story in your pocket.",
      "appStore": "App Store",
      "googlePlay": "Google Play"
    },
    "trustStrip": {
      "patientAccess": "Patient-granted access",
      "collaboration": "Real-time collaboration",
      "patientCentric": "Built around the patient"
    },
    "features": {
      "transcribedSessions": "Transcribed Sessions",
      "transcribedDescription": "Voice transcribed in real time. AI extracts diagnoses, prescriptions and follow-up tasks automatically.",
      "medicationAdherence": "Medication Adherence",
      "medicationDescription": "Verified ingestion. Confidence scored. Provisional doses auto-approved monthly.",
      "rewardsEarned": "+5 Rewards earned",
      "roundTableFeature": "Round Table",
      "roundTableDescription": "Specialists coordinate per patient with shared notes and read-receipts.",
      "aiAssistant": "AI Clinical Assistant",
      "aiAssistantDescription": "Patient history summaries · medication conflict alerts · imaging analysis · auto-generated documents.",
      "holarcHelp": "Holarc Help (SOS)",
      "holarcHelpDescription": "One-tap dispatch to nearby emergency responders and hospitals with live location, ETA tracking, and full medical context shared on arrival.",
      "emergencyResponders": "Emergency responders",
      "hospitals": "Hospitals",
      "bloodBanks": "Blood banks"
    },
    "patientBenefits": {
      "sectionBadge": "For Patients",
      "sectionTitle": "Your Health.",
      "sectionTitleHighlight": "360° View.",
      "sectionDescription": "Holarc gives you a complete 360-degree view of your health profile—every consultation, prescription, and clinical note from every provider, unified in one place and entirely under your control."
    },
    "providerBenefits": {
      "sectionBadge": "For Healthcare Providers",
      "sectionTitle": "Practice with the Full Picture",
      "sectionDescription": "When patients grant you access, you see everything—their complete history across all providers. Make better decisions with better information."
    },
    "cta": {
      "title": "Ready for Healthcare That Works Together?",
      "description": "Join thousands of patients and providers building a better healthcare experience—one where your health story is complete, connected, and under your control.",
      "button": "Get Started Today"
    },
    "roleDialog": {
      "title": "Join Holarc",
      "description": "How will you use the platform?",
      "label": "I am a...",
      "placeholder": "Select user type",
      "options": {
        "patient": "Patient",
        "doctor": "Healthcare Provider",
        "hospital": "Hospital",
        "emergency": "Emergency Service Provider",
        "insurance": "Insurance Company",
        "pharmacy": "Pharmacy"
      },
      "continueButton": "Continue"
    }
  }
};

// For now, add English translations to all language files (we'll improve translations later)
const languages = ['en', 'af', 'zu', 'xh', 'sn', 'sw', 'ha', 'ig', 'ar', 'de', 'el', 'es', 'fr', 'he', 'hi', 'it', 'ja', 'ko', 'nl', 'pl', 'pt', 'ru', 'tr', 'yo', 'zh'];

for (const lang of languages) {
  const filepath = `src/i18n/locales/${lang}.json`;
  const json = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  
  json.landing = landingTranslations.landing;
  
  fs.writeFileSync(filepath, JSON.stringify(json, null, 2) + '\n');
  console.log(`✓ Added landing translations to ${lang}.json`);
}

console.log('\n✅ Landing translations added to all 25 language files');
