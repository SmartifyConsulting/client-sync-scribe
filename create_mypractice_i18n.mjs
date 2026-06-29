import fs from 'fs';

// Core UI strings extracted from MyPractice.tsx based on analysis
const myPracticeTranslations = {
  // Main tabs
  "myPractice.tabProfile": "Profile",
  "myPractice.tabServices": "Services",
  "myPractice.tabSchedule": "Schedule",
  "myPractice.tabPatients": "Patients",
  "myPractice.tabInvoices": "Invoices",
  "myPractice.tabReferrals": "Referrals",
  "myPractice.tabRoundTables": "Round Tables",
  "myPractice.tabRewards": "Rewards",
  "myPractice.tabDocuments": "Documents",
  "myPractice.tabHospitals": "Hospital Affiliations",

  // Profile section
  "myPractice.profileTitle": "Practice Profile",
  "myPractice.profileDescription": "Manage your professional information and credentials",
  "myPractice.basicInfo": "Basic Information",
  "myPractice.name": "Full Name",
  "myPractice.email": "Email",
  "myPractice.phone": "Phone",
  "myPractice.specialty": "Specialty",
  "myPractice.qualifications": "Qualifications",
  "myPractice.practiceNumber": "Practice Number",
  "myPractice.bio": "Professional Bio",
  "myPractice.credentials": "Credentials & Certifications",
  "myPractice.addCredential": "Add Credential",
  "myPractice.editCredential": "Edit Credential",
  "myPractice.certificateName": "Certificate Name",
  "myPractice.issuingBody": "Issuing Body",
  "myPractice.dateEarned": "Date Earned",
  "myPractice.cpdPoints": "CPD Points",

  // Services section
  "myPractice.servicesTitle": "Services & Pricing",
  "myPractice.servicesDescription": "Define your services and set pricing",
  "myPractice.addService": "Add Service",
  "myPractice.serviceName": "Service Name",
  "myPractice.defaultPrice": "Default Price",
  "myPractice.currency": "Currency",
  "myPractice.serviceColor": "Service Color",
  "myPractice.deleteService": "Delete Service",
  "myPractice.editService": "Edit Service",

  // Signature section
  "myPractice.signatureTitle": "Digital Signature",
  "myPractice.signatureDescription": "Create your digital signature for documents",
  "myPractice.signatureFont": "Font Style",
  "myPractice.signaturePreview": "Preview",

  // Practice settings
  "myPractice.practiceSettings": "Practice Settings",
  "myPractice.practiceLanguage": "Practice Language",
  "myPractice.practiceTimezone": "Timezone",
  "myPractice.consultationFee": "Default Consultation Fee",

  // Team/Members
  "myPractice.teamMembers": "Team Members",
  "myPractice.inviteMember": "Invite Team Member",
  "myPractice.memberEmail": "Member Email",
  "myPractice.memberRole": "Role",
  "myPractice.removeMember": "Remove Member",

  // Actions
  "myPractice.save": "Save",
  "myPractice.cancel": "Cancel",
  "myPractice.delete": "Delete",
  "myPractice.edit": "Edit",
  "myPractice.add": "Add",
  "myPractice.upload": "Upload",
  "myPractice.leave": "Leave Practice",

  // Messages
  "myPractice.savingProfile": "Saving profile...",
  "myPractice.profileUpdated": "Profile updated successfully",
  "myPractice.errorUpdatingProfile": "Error updating profile",
  "myPractice.uploadingAvatar": "Uploading profile picture...",
  "myPractice.uploadingLogo": "Uploading logo...",
  "myPractice.invalidFileType": "Invalid file type",
  "myPractice.uploadFailed": "Upload failed",
  "myPractice.required": "Required field",
  "myPractice.missingFields": "Please fill all required fields",

  // Schedule
  "myPractice.scheduleTitle": "Schedule",
  "myPractice.setAvailability": "Set Your Availability",

  // Patients
  "myPractice.connectedPatients": "Connected Patients",

  // Invoices
  "myPractice.invoicesTitle": "Invoices",

  // Referrals
  "myPractice.referralDoctors": "Referral Network",

  // Empty states
  "myPractice.noServices": "No services added yet",
  "myPractice.noCredentials": "No credentials added yet",
  "myPractice.noPatients": "No patients connected yet",
};

const languages = ['en', 'af', 'zu', 'xh', 'sn', 'sw', 'ha', 'ig', 'ar', 'de', 'el', 'es', 'fr', 'he', 'hi', 'it', 'ja', 'ko', 'nl', 'pl', 'pt', 'ru', 'tr', 'yo', 'zh'];

for (const lang of languages) {
  const filepath = `src/i18n/locales/${lang}.json`;
  const json = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  
  // Ensure myPractice section exists
  if (!json.myPractice) json.myPractice = {};
  
  // Add all keys
  for (const [key, value] of Object.entries(myPracticeTranslations)) {
    const keyParts = key.split('.');
    if (keyParts[0] === 'myPractice') {
      json.myPractice[keyParts[1]] = value;
    }
  }
  
  fs.writeFileSync(filepath, JSON.stringify(json, null, 2) + '\n');
  console.log(`✓ Added MyPractice i18n to ${lang}.json`);
}

console.log('\n✅ MyPractice translations added to all 25 language files');
