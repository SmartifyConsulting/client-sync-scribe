import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const newKeys = {
    "dialogs": {
        "subscriptionRequired": "Subscription Required",
        "subscribeMessage": "Subscribe to continue using all features of the app.",
        "subscribeMonthly": "Monthly",
        "priceMonthly": "From $9.99",
        "perMonth": "per month",
        "subscribeAnnual": "Annual",
        "priceAnnual": "From $99.99",
        "perYear": "per year",
        "save17Percent": "Save 17%",
        "subscribeNow": "Subscribe Now",
        "subscriptionManagement": "You can manage your subscription anytime from Settings.",
        "dataSharing": "Data Sharing Transparency",
        "sharedWithCareTeam": "Shared with Care Team",
        "sharedWithPatientCareTeam": "Shared with Patient's Care Team",
        "privateNotShared": "Private — Not Shared",
        "privateToYourPractice": "Private to Your Practice — Not Shared",
        "otherDoctorsWillSee": "What other doctors on this patient's profile will and won't see from your sessions and records.",
        "holisticHealthSharing": "Holistic Health Sharing",
        "holisticHealthDescription": "Sharing your AI Session Summaries, Patient Information, and Medical Overview helps your doctors see the full picture of your health for the safest and most accurate care.",
        "limitingAccessWarning": "Important: Limiting access to your profile may prevent your doctors from seeing the holistic view of your health which ensures the safest and most accurate care.",
        "iUnderstand": "I Understand"
    },
    "permissions": {
        "aiSessionSummaries": "Your AI Session Summaries",
        "patientInformation": "Your Patient Information",
        "medicalOverview": "Your Patient Medical Overview",
        "documents": "Your Documents",
        "prescriptions": "Prescriptions",
        "hospitalAdmissions": "Hospital Admissions",
        "patientImages": "Patient Images",
        "patientVideos": "Patient Videos",
        "testResults": "Test Results",
        "scans": "Scans",
        "fullTranscriptions": "Full Transcriptions",
        "rawAudioRecordings": "Raw Audio Recordings",
        "aiDiagnostics": "AI Diagnostics",
        "clinicalDrawings": "Clinical Drawings/Sketches",
        "invoicesAndBilling": "Invoices & Billing Data",
        "medicalCertificates": "Medical Certificates",
        "doctorContribution": "Your contribution to the patient's AI Summary",
        "visitSummary": "Your visit summary on the patient's timeline",
        "issuedPrescriptions": "Prescriptions you issue",
        "medicalHistory": "Information relevant to the patient's ailments and medical history",
        "credentials": "Your Credentials",
        "aboutMe": "Your About Me",
        "sessionHistory": "Full Session History details",
        "draftNotes": "Your Draft Notes"
    },
    "forms": {
        "validation": {
            "required": "This field is required",
            "email": "Please enter a valid email",
            "minLength": "Minimum length is {{min}} characters",
            "maxLength": "Maximum length is {{max}} characters",
            "pattern": "Please match the requested format",
            "invalid": "Please enter a valid value"
        }
    }
};

const localeDir = path.join(__dirname, 'src/i18n/locales');
const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.json'));

console.log(`Found ${files.length} locale files`);

files.forEach(file => {
    const filePath = path.join(localeDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Remove BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }

    const data = JSON.parse(content);

    // Merge keys
    if (!data.dialogs) data.dialogs = {};
    Object.assign(data.dialogs, newKeys.dialogs);

    if (!data.permissions) data.permissions = {};
    Object.assign(data.permissions, newKeys.permissions);

    if (!data.forms) data.forms = {};
    if (!data.forms.validation) data.forms.validation = {};
    Object.assign(data.forms.validation, newKeys.forms.validation);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
    console.log(`Updated ${file}`);
});

console.log('✓ All locale files updated');
