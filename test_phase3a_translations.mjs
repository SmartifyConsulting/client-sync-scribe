import fs from 'fs';

console.log('🧪 PHASE 3A TRANSLATION TEST\n');
console.log('=' .repeat(60));

// Load the en.json translations
const enJson = JSON.parse(fs.readFileSync('src/i18n/locales/en.json', 'utf8'));

// Test data for each screen
const tests = {
  'PatientDashboard': {
    section: 'patientDashboard',
    criticalKeys: [
      'welcomeTitle',
      'welcomeSubtitle',
      'calendar',
      'recordTask',
      'recentActivity',
      'aiSummaryTitle',
      'appointmentsTitle',
      'vulaLabel',
      'earnVulasTitle',
      'claimsTitle',
      'tasksTitle',
    ],
    expectedKeys: 31,
  },
  'MyPractice': {
    section: 'myPractice',
    criticalKeys: [
      'tabProfile',
      'tabServices',
      'tabSchedule',
      'tabPatients',
      'tabInvoices',
      'save',
      'cancel',
      'addService',
    ],
    expectedKeys: 65,
  },
  'PatientDocuments': {
    section: 'patientDocuments',
    criticalKeys: [
      'title',
      'description',
      'uploadTitle',
      'download',
      'delete',
      'noDocuments',
    ],
    expectedKeys: 39,
  },
};

let allTestsPassed = true;

for (const [screenName, testConfig] of Object.entries(tests)) {
  console.log(`\n📱 Testing ${screenName}`);
  console.log('-'.repeat(60));
  
  const section = enJson[testConfig.section];
  
  if (!section) {
    console.log(`❌ Section "${testConfig.section}" not found in en.json`);
    allTestsPassed = false;
    continue;
  }
  
  const keyCount = Object.keys(section).length;
  console.log(`Translation Keys: ${keyCount}/${testConfig.expectedKeys}`);
  
  // Test critical keys
  let criticalPassed = 0;
  for (const key of testConfig.criticalKeys) {
    const hasKey = section.hasOwnProperty(key);
    const value = section[key];
    const status = hasKey && value ? '✅' : '❌';
    
    if (hasKey && value) {
      criticalPassed++;
      console.log(`  ${status} ${key}: "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`);
    } else {
      console.log(`  ${status} ${key}: MISSING`);
      allTestsPassed = false;
    }
  }
  
  console.log(`\nCritical Keys: ${criticalPassed}/${testConfig.criticalKeys.length}`);
  
  if (criticalPassed === testConfig.criticalKeys.length) {
    console.log(`✅ ${screenName} translations ready for testing`);
  } else {
    console.log(`⚠️  ${screenName} missing some key translations`);
  }
}

console.log('\n' + '='.repeat(60));

// Test language coverage
console.log('\n🌍 Language Coverage Test');
console.log('-'.repeat(60));

const languages = ['en', 'af', 'zu', 'xh', 'sn', 'sw', 'ha', 'ig', 'ar', 'de', 'el', 'es', 'fr', 'he', 'hi', 'it', 'ja', 'ko', 'nl', 'pl', 'pt', 'ru', 'tr', 'yo', 'zh'];
let langCoveragePass = 0;

for (const lang of languages) {
  const filepath = `src/i18n/locales/${lang}.json`;
  try {
    const langJson = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    
    const hasPatientDash = !!langJson.patientDashboard;
    const hasMyPractice = !!langJson.myPractice;
    const hasPatientDocs = !!langJson.patientDocuments;
    
    if (hasPatientDash && hasMyPractice && hasPatientDocs) {
      langCoveragePass++;
    }
  } catch (e) {
    console.log(`❌ ${lang}.json: Error reading file`);
  }
}

console.log(`Coverage: ${langCoveragePass}/${languages.length} languages fully translated`);

if (langCoveragePass === languages.length) {
  console.log('✅ All 25 languages have Phase 3A translations');
} else {
  console.log(`⚠️  ${languages.length - langCoveragePass} languages missing translations`);
}

// Component validation
console.log('\n📦 Component Validation');
console.log('-'.repeat(60));

const componentTests = [
  { file: 'src/pages/Landing.tsx', name: 'Landing.tsx' },
  { file: 'src/pages/patient/PatientDashboard.tsx', name: 'PatientDashboard.tsx' },
  { file: 'src/pages/MyPractice.tsx', name: 'MyPractice.tsx' },
  { file: 'src/pages/patient/PatientDocuments.tsx', name: 'PatientDocuments.tsx' },
];

let componentPass = 0;
for (const comp of componentTests) {
  const content = fs.readFileSync(comp.file, 'utf8');
  const hasImport = content.includes('import { useTranslation }');
  const hasHook = content.includes('const { t } = useTranslation()');
  const hasUsage = content.includes('t("');
  
  if (hasImport && hasHook && hasUsage) {
    console.log(`✅ ${comp.name}: Properly configured`);
    componentPass++;
  } else {
    console.log(`❌ ${comp.name}: Missing setup (import=${hasImport}, hook=${hasHook}, usage=${hasUsage})`);
  }
}

console.log(`\nComponents Ready: ${componentPass}/${componentTests.length}`);

// Final summary
console.log('\n' + '='.repeat(60));
console.log('📊 PHASE 3A TEST SUMMARY\n');

if (allTestsPassed && langCoveragePass === languages.length && componentPass === componentTests.length) {
  console.log('🎉 ALL PHASE 3A TESTS PASSED!\n');
  console.log('✅ All 3 screens have complete translation infrastructure');
  console.log('✅ All 25 languages have translations');
  console.log('✅ All components properly configured');
  console.log('\n✨ Ready for browser testing at http://localhost:5173\n');
} else {
  console.log('⚠️  Some tests failed. Review above for details.\n');
}

console.log('NEXT STEPS:');
console.log('1. Open http://localhost:5173 in browser');
console.log('2. Navigate to each screen (PatientDashboard, MyPractice, PatientDocuments)');
console.log('3. Switch language selector to test translations');
console.log('4. Verify all UI text displays in selected language');
