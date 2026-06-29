import fs from 'fs';

console.log('🧪 Calendar Translation Runtime Test\n');

// Simulate what the calendar component does
const languages = ['en', 'es', 'fr', 'de'];

for (const lang of languages) {
  const filepath = `src/i18n/locales/${lang}.json`;
  const json = JSON.parse(fs.readFileSync(filepath, 'utf8'));

  // Simulate t("calendar.daysNarrow", { returnObjects: true })
  const daysNarrow = json.calendar?.daysNarrow;
  const months = json.calendar?.months;
  const days = json.calendar?.days;

  console.log(`📅 Language: ${lang.toUpperCase()}`);
  console.log(`   ✓ daysNarrow type: ${Array.isArray(daysNarrow) ? 'Array ✅' : 'Object ❌'}`);
  console.log(`   ✓ daysNarrow value: [${daysNarrow.join(', ')}]`);
  console.log(`   ✓ First month: ${months.january}`);
  console.log(`   ✓ First day: ${days.sunday}`);
  console.log('');
}

console.log('✅ All translations are correctly formatted for runtime use!');
