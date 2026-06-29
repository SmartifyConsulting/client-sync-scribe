import fs from 'fs';

const patientDocumentsTranslations = {
  // Main sections
  "patientDocuments.title": "My Documents",
  "patientDocuments.description": "Your medical documents, lab results, and health records",
  "patientDocuments.uploadNew": "Upload Document",
  "patientDocuments.filter": "Filter Documents",
  "patientDocuments.sort": "Sort By",

  // Document types
  "patientDocuments.typeAll": "All Documents",
  "patientDocuments.typeLab": "Lab Results",
  "patientDocuments.typeImaging": "Imaging",
  "patientDocuments.typePrescription": "Prescriptions",
  "patientDocuments.typeReport": "Medical Reports",
  "patientDocuments.typeOther": "Other",

  // Actions
  "patientDocuments.download": "Download",
  "patientDocuments.delete": "Delete",
  "patientDocuments.share": "Share",
  "patientDocuments.view": "View",
  "patientDocuments.upload": "Upload",

  // Table headers
  "patientDocuments.documentName": "Document Name",
  "patientDocuments.documentType": "Type",
  "patientDocuments.uploadedBy": "Uploaded By",
  "patientDocuments.uploadedDate": "Upload Date",
  "patientDocuments.provider": "Provider",
  "patientDocuments.actions": "Actions",

  // Empty states
  "patientDocuments.noDocuments": "No documents yet",
  "patientDocuments.noDocumentsDescription": "Documents will appear here as your healthcare providers upload them",

  // Upload modal
  "patientDocuments.uploadTitle": "Upload Document",
  "patientDocuments.uploadDescription": "Add a new medical document to your health record",
  "patientDocuments.selectFile": "Select File",
  "patientDocuments.fileName": "File Name",
  "patientDocuments.documentTypeLabel": "Document Type",
  "patientDocuments.dragDrop": "Drag and drop your file here",
  "patientDocuments.selectFilePrompt": "Or click to select",

  // Messages
  "patientDocuments.uploading": "Uploading...",
  "patientDocuments.uploadSuccess": "Document uploaded successfully",
  "patientDocuments.uploadError": "Failed to upload document",
  "patientDocuments.deleteConfirm": "Are you sure you want to delete this document?",
  "patientDocuments.deleteSuccess": "Document deleted",
  "patientDocuments.deleteError": "Failed to delete document",
  "patientDocuments.invalidFileType": "Invalid file type",
  "patientDocuments.fileTooLarge": "File is too large",
};

const languages = ['en', 'af', 'zu', 'xh', 'sn', 'sw', 'ha', 'ig', 'ar', 'de', 'el', 'es', 'fr', 'he', 'hi', 'it', 'ja', 'ko', 'nl', 'pl', 'pt', 'ru', 'tr', 'yo', 'zh'];

for (const lang of languages) {
  const filepath = `src/i18n/locales/${lang}.json`;
  const json = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  
  if (!json.patientDocuments) json.patientDocuments = {};
  
  for (const [key, value] of Object.entries(patientDocumentsTranslations)) {
    const keyParts = key.split('.');
    if (keyParts[0] === 'patientDocuments') {
      json.patientDocuments[keyParts[1]] = value;
    }
  }
  
  fs.writeFileSync(filepath, JSON.stringify(json, null, 2) + '\n');
  console.log(`✓ Added PatientDocuments i18n to ${lang}.json`);
}

console.log('\n✅ PatientDocuments translations added to all 25 language files');
