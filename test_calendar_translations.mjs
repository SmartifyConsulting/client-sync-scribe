import fs from 'fs';

// Test 1: Check that all language files have calendar translation keys
const languages = ['en', 'es', 'fr', 'de', 'pt', 'af'];
let allPass = true;

console.log('🧪 Testing Calendar Translation Keys\n');

for (const lang of languages) {
  const filepath = `src/i18n/locales/${lang}.json`;
  const json = JSON.parse(fs.readFileSync(filepath, 'utf8'));

  const hasMonths = json.calendar?.months && typeof json.calendar.months === 'object';
  const hasMonthsShort = json.calendar?.monthsShort && typeof json.calendar.monthsShort === 'object';
  const hasDays = json.calendar?.days && typeof json.calendar.days === 'object';
  const hasDaysShort = json.calendar?.daysShort && typeof json.calendar.daysShort === 'object';
  const hasDaysNarrow = json.calendar?.daysNarrow && Array.isArray(json.calendar.daysNarrow);

  const isValid = hasMonths && hasMonthsShort && hasDays && hasDaysShort && hasDaysNarrow;

  if (isValid) {
    console.log(`✅ ${lang}.json - all keys present`);
    if (lang === 'es') {
      console.log(`   months: ${json.calendar.months.january}, ${json.calendar.months.february}...`);
      console.log(`   daysNarrow: ${json.calendar.daysNarrow.join(', ')}`);
    }
  } else {
    console.log(`❌ ${lang}.json - MISSING keys`);
    allPass = false;
  }
}

console.log('\n' + (allPass ? '✅ All translation keys are present!' : '❌ Some keys are missing!'));
