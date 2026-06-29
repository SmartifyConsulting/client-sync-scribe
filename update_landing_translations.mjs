import fs from 'fs';

// Read the current Landing.tsx file
let content = fs.readFileSync('src/pages/Landing.tsx', 'utf8');

// Replace hardcoded strings with t() calls in capability pills
const capabilityMappings = {
  '"Voice Consultations"': 't("landing.capabilities.voiceConsultations")',
  '"AI Summaries"': 't("landing.capabilities.aiSummaries")',
  '"Incentivized Adherence"': 't("landing.capabilities.incentivizedAdherence")',
  '"Rewards"': 't("landing.capabilities.rewards")',
  '"Round Table"': 't("landing.capabilities.roundTable")',
  '"Prescriptions"': 't("landing.capabilities.prescriptions")',
  '"Hospital Admissions"': 't("landing.capabilities.hospitalAdmissions")',
  '"Auto-Tasks"': 't("landing.capabilities.autoTasks")',
  '"Unified Calendar"': 't("landing.capabilities.unifiedCalendar")',
  '"Emergency SOS"': 't("landing.capabilities.emergencySOS")',
  '"Emergency Response Dispatch"': 't("landing.capabilities.emergencyResponseDispatch")',
  '"Hospital Network"': 't("landing.capabilities.hospitalNetwork")',
};

// Apply capability pill replacements
for (const [old, newStr] of Object.entries(capabilityMappings)) {
  content = content.replace(new RegExp(old, 'g'), newStr);
}

// Replace hero section strings
content = content.replace(
  'AI-powered · Patient-controlled · HIPAA-aligned',
  '{t("landing.hero.badge")}'
);

content = content.replace(
  'A revolutionary healthcare ecosystem',
  '{t("landing.hero.title")}'
);

content = content.replace(
  'built around you.',
  '{t("landing.hero.titleHighlight")}'
);

// Replace hero description
content = content.replace(
  `Holarc is one connected platform where doctors run their entire practice and patients own their entire
              360° health story — from voice-recorded consultations and AI summaries, to video-verified medication
              adherence rewards, cross-specialist Round Tables, hospital admissions, prescriptions, billing, and a
              unified care calendar.`,
  `{t("landing.hero.description")}`
);

// Replace main CTA button
content = content.replace(
  'Join the Ecosystem',
  '{t("landing.hero.cta")}'
);

// Replace Doctors button
content = content.replace(
  'Doctors',
  '{t("landing.hero.doctorsButton")}'
);

// Replace Patients button
content = content.replace(
  'Patients',
  '{t("landing.hero.patientsButton")}'
);

// Replace mobile section
content = content.replace(
  'Get Holarc on your phone',
  '{t("landing.mobile.title")}'
);

content = content.replace(
  'Available on iOS and Android — your full health story in your pocket.',
  '{t("landing.mobile.description")}'
);

// Save the updated file
fs.writeFileSync('src/pages/Landing.tsx', content);
console.log('✓ Updated Landing.tsx with translation keys');
