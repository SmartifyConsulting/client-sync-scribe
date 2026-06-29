import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const admissionsKeys = {
    "vitals": {
        "title": "Add Vitals",
        "heartRate": "Heart Rate (bpm)",
        "spo2": "SpO₂ (%)",
        "bpSystolic": "BP Systolic",
        "bpDiastolic": "BP Diastolic",
        "temperature": "Temperature (°C)",
        "bmi": "BMI",
        "height": "Height (cm)",
        "weight": "Weight (kg)",
        "notes": "Notes"
    }
};

const localeDir = path.join(__dirname, 'src/i18n/locales');
const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.json'));

console.log(`Adding Admissions keys to ${files.length} language files...`);

files.forEach(file => {
    const filePath = path.join(localeDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    
    const data = JSON.parse(content);
    
    if (!data.admissions) data.admissions = {};
    Object.assign(data.admissions, admissionsKeys);
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
    console.log(`✓ ${file}`);
});

console.log('\nAdmissions keys added successfully!');
