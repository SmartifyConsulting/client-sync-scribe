import fs from 'fs';

// Update PatientDocuments.tsx - add t() calls for key UI strings
let patientDocsContent = fs.readFileSync('src/pages/patient/PatientDocuments.tsx', 'utf8');

// Add useTranslation hook invocation in component (find and replace main component function)
if (patientDocsContent.includes('export default function PatientDocuments()') && !patientDocsContent.includes('const { t } = useTranslation();')) {
  patientDocsContent = patientDocsContent.replace(
    'export default function PatientDocuments() {',
    'export default function PatientDocuments() {\n  const { t } = useTranslation();'
  );
}

// Replace hardcoded UI strings with t() calls
const patientDocReplacements = [
  ['"Upload Document"', 't("patientDocuments.uploadTitle")'],
  ['"My Documents"', 't("patientDocuments.title")'],
  ['"Your medical documents, lab results, and health records"', 't("patientDocuments.description")'],
  ['"Download"', 't("patientDocuments.download")'],
  ['"Delete"', 't("patientDocuments.delete")'],
  ['"Share"', 't("patientDocuments.share")'],
  ['"No documents yet"', 't("patientDocuments.noDocuments")'],
  ['"Uploading..."', 't("patientDocuments.uploading")'],
  ['"Document uploaded successfully"', 't("patientDocuments.uploadSuccess")'],
  ['"Failed to upload document"', 't("patientDocuments.uploadError")'],
];

for (const [oldStr, newStr] of patientDocReplacements) {
  // Use simple string replacement with proper escaping
  patientDocsContent = patientDocsContent.replace(oldStr, newStr);
}

fs.writeFileSync('src/pages/patient/PatientDocuments.tsx', patientDocsContent);
console.log('✓ Updated PatientDocuments.tsx with t() calls');

// Update MyPractice.tsx - add t() calls
let myPracticeContent = fs.readFileSync('src/pages/MyPractice.tsx', 'utf8');

// Add useTranslation hook invocation if not already there
if (myPracticeContent.includes('export default function MyPractice()') && !myPracticeContent.includes('const { t } = useTranslation();')) {
  myPracticeContent = myPracticeContent.replace(
    'export default function MyPractice() {',
    'export default function MyPractice() {\n  const { t } = useTranslation();'
  );
}

// Replace hardcoded UI strings with t() calls in MyPractice
const myPracticeReplacements = [
  ['"Profile"', 't("myPractice.tabProfile")'],
  ['"Services"', 't("myPractice.tabServices")'],
  ['"Schedule"', 't("myPractice.tabSchedule")'],
  ['"Patients"', 't("myPractice.tabPatients")'],
  ['"Invoices"', 't("myPractice.tabInvoices")'],
  ['"Referrals"', 't("myPractice.tabReferrals")'],
  ['"Round Tables"', 't("myPractice.tabRoundTables")'],
  ['"Rewards"', 't("myPractice.tabRewards")'],
  ['"Documents"', 't("myPractice.tabDocuments")'],
  ['"Save"', 't("myPractice.save")'],
  ['"Cancel"', 't("myPractice.cancel")'],
  ['"Add Service"', 't("myPractice.addService")'],
  ['"Edit Credential"', 't("myPractice.editCredential")'],
  ['"Add Credential"', 't("myPractice.addCredential")'],
];

for (const [oldStr, newStr] of myPracticeReplacements) {
  myPracticeContent = myPracticeContent.replace(oldStr, newStr);
}

fs.writeFileSync('src/pages/MyPractice.tsx', myPracticeContent);
console.log('✓ Updated MyPractice.tsx with t() calls');

console.log('\n✅ Phase 3A component updates complete');
