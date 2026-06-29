import fs from 'fs';

const additionalTranslations = {
  "landing.patientBenefits.benefit1Title": "Complete Health Picture",
  "landing.patientBenefits.benefit1Description": "See your entire medical history, prescriptions, and care team in one unified view—no more scattered records.",
  "landing.patientBenefits.benefit2Title": "Connect Your Care Team",
  "landing.patientBenefits.benefit2Description": "Invite specialists, GPs, and other providers to collaborate on your care with your full consent.",
  "landing.patientBenefits.benefit3Title": "You're in Control",
  "landing.patientBenefits.benefit3Description": "Decide exactly which doctors see your records. Grant or revoke access anytime with granular permissions.",
  "landing.patientBenefits.benefit4Title": "Unified Appointments",
  "landing.patientBenefits.benefit4Description": "All your healthcare appointments from every provider in one calendar—never miss a follow-up.",
  "landing.providerBenefits.benefit1Title": "AI-Powered Insights",
  "landing.providerBenefits.benefit1Description": "Get comprehensive patient history summaries and medication conflict alerts before every consultation.",
  "landing.providerBenefits.benefit2Title": "Seamless Collaboration",
  "landing.providerBenefits.benefit2Description": "Round Table notes enable real-time communication with other specialists caring for the same patient.",
  "landing.providerBenefits.benefit3Title": "Automated Documentation",
  "landing.providerBenefits.benefit3Description": "Voice-to-text notes, auto-populated templates, and AI summaries save hours of administrative work.",
  "landing.providerBenefits.benefit4Title": "Better Patient Outcomes",
  "landing.providerBenefits.benefit4Description": "Access complete patient history across all their providers—make informed decisions with the full picture.",
  "landing.providerBenefits.benefit5Title": "Emergency Service Providers",
  "landing.providerBenefits.benefit5Description": "Emergency response crews onboard in minutes, accept SOS incidents with one tap, share live ETA, and arrive with the patient's full medical context.",
  "landing.providerBenefits.benefit6Title": "Hospital Partners",
  "landing.providerBenefits.benefit6Description": "Hospitals receive inbound emergencies with prefilled patient summaries, manage admissions, and coordinate with referring doctors in real time.",
};

const languages = ['en', 'af', 'zu', 'xh', 'sn', 'sw', 'ha', 'ig', 'ar', 'de', 'el', 'es', 'fr', 'he', 'hi', 'it', 'ja', 'ko', 'nl', 'pl', 'pt', 'ru', 'tr', 'yo', 'zh'];

for (const lang of languages) {
  const filepath = `src/i18n/locales/${lang}.json`;
  const json = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  
  // Add benefits keys
  for (const [key, value] of Object.entries(additionalTranslations)) {
    const keys = key.split('.');
    let current = json;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }
  
  fs.writeFileSync(filepath, JSON.stringify(json, null, 2) + '\n');
  console.log(`✓ Added benefit translations to ${lang}.json`);
}

console.log('\n✅ Benefit translations added to all 25 language files');
