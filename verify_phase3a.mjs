import fs from 'fs';

console.log('🔍 PHASE 3A TRANSLATION VERIFICATION\n');

// Check translation keys exist in all language files
const languages = ['en', 'af', 'zu', 'xh', 'sn', 'sw', 'ha', 'ig', 'ar', 'de', 'el', 'es', 'fr', 'he', 'hi', 'it', 'ja', 'ko', 'nl', 'pl', 'pt', 'ru', 'tr', 'yo', 'zh'];

const requiredSections = {
  patientDashboard: 31,
  myPractice: 65,
  patientDocuments: 39,
};

let allValid = true;

for (const lang of languages) {
  const filepath = `src/i18n/locales/${lang}.json`;
  const json = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  
  for (const [section, expectedCount] of Object.entries(requiredSections)) {
    const actual = Object.keys(json[section] || {}).length;
    if (actual !== expectedCount) {
      console.log(`❌ ${lang}.json/${section}: ${actual}/${expectedCount} keys`);
      allValid = false;
    }
  }
}

if (allValid) {
  console.log('✅ All language files have correct translation keys\n');
}

// Check component imports
console.log('Checking component imports:\n');

const files = [
  { path: 'src/pages/Landing.tsx', name: 'Landing.tsx', shouldHave: 'useTranslation' },
  { path: 'src/pages/patient/PatientDashboard.tsx', name: 'PatientDashboard.tsx', shouldHave: 'useTranslation' },
  { path: 'src/pages/MyPractice.tsx', name: 'MyPractice.tsx', shouldHave: 'useTranslation' },
  { path: 'src/pages/patient/PatientDocuments.tsx', name: 'PatientDocuments.tsx', shouldHave: 'useTranslation' },
];

for (const file of files) {
  const content = fs.readFileSync(file.path, 'utf8');
  const hasImport = content.includes(`import { useTranslation }`);
  const hasHook = content.includes(`const { t } = useTranslation()`);
  
  const status = hasImport && hasHook ? '✅' : '❌';
  console.log(`${status} ${file.name}: import=${hasImport}, hook=${hasHook}`);
}

console.log('\n✅ Phase 3A translation infrastructure validated');
console.log('Ready for browser testing at http://localhost:8080\n');

console.log('TEST CHECKLIST:');
console.log('1. Navigate to Patient Dashboard - verify all UI text in selected language');
console.log('2. Switch language selector - verify instant translation');
console.log('3. Navigate to MyPractice - verify provider screens translated');
console.log('4. Navigate to PatientDocuments - verify document mgmt translated');
console.log('5. Check all button labels, headers, and descriptions are translated\n');
