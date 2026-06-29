import fs from 'fs';

const patientDashboardTranslations = {
  "patientDashboard.welcomeTitle": "Welcome back",
  "patientDashboard.welcomeSubtitle": "Your health dashboard at a glance",
  "patientDashboard.calendar": "Calendar",
  "patientDashboard.recordTask": "Record Task",
  "patientDashboard.recentActivity": "Recent Activity",
  "patientDashboard.aiSummaryTitle": "AI Health Summary",
  "patientDashboard.aiSummaryEmpty": "No health summary available yet. Visit your doctor to build your health profile.",
  "patientDashboard.appointmentsTitle": "Upcoming Appointments",
  "patientDashboard.appointmentsEmpty": "No upcoming appointments.",
  "patientDashboard.doctorFallback": "Doctor",
  "patientDashboard.vulaLabel": "My Vula Vouchers",
  "patientDashboard.earnVulasTitle": "Earn More Vulas",
  "patientDashboard.earnVulasDescription": "Tips to boost your rewards",
  "patientDashboard.tip1": "Log daily medication intake",
  "patientDashboard.tip2": "Complete tasks from your doctor",
  "patientDashboard.tip3": "Upload health photos regularly",
  "patientDashboard.tip4": "Keep visit streaks going",
  "patientDashboard.claimsTitle": "Recent Claims",
  "patientDashboard.claimsAllInvoices": "All Invoices",
  "patientDashboard.claimsDescription": "Invoices submitted to your medical aid",
  "patientDashboard.claimsEmpty": "No claims submitted recently.",
  "patientDashboard.claimsSubmitted": "Submitted",
  "patientDashboard.documentationTitle": "Documentation",
  "patientDashboard.documentationDescription": "View your documents and records",
  "patientDashboard.tasksTitle": "Assigned Tasks",
  "patientDashboard.tasksViewAll": "View All",
  "patientDashboard.tasksDescription": "Complete tasks to earn Vulas",
  "patientDashboard.tasksDue": "Due",
};

const languages = ['en', 'af', 'zu', 'xh', 'sn', 'sw', 'ha', 'ig', 'ar', 'de', 'el', 'es', 'fr', 'he', 'hi', 'it', 'ja', 'ko', 'nl', 'pl', 'pt', 'ru', 'tr', 'yo', 'zh'];

for (const lang of languages) {
  const filepath = `src/i18n/locales/${lang}.json`;
  const json = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  
  // Ensure patientDashboard section exists
  if (!json.patientDashboard) json.patientDashboard = {};
  
  // Add all keys
  for (const [key, value] of Object.entries(patientDashboardTranslations)) {
    const keyParts = key.split('.');
    if (keyParts[0] === 'patientDashboard') {
      json.patientDashboard[keyParts[1]] = value;
    }
  }
  
  fs.writeFileSync(filepath, JSON.stringify(json, null, 2) + '\n');
  console.log(`✓ Added PatientDashboard i18n to ${lang}.json`);
}

console.log('\n✅ PatientDashboard translations added to all 25 language files');
