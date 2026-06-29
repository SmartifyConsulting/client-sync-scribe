import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const medKeys = {
    "medication": {
        "title": "Add Active Medication",
        "name": "Medication Name",
        "dosage": "Dosage",
        "dosagePlaceholder": "e.g. 500mg",
        "frequency": "Frequency",
        "frequencyPlaceholder": "e.g. twice daily",
        "notes": "Notes"
    }
};

const localeDir = path.join(__dirname, 'src/i18n/locales');
const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
    const filePath = path.join(localeDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    
    const data = JSON.parse(content);
    if (!data.admissions) data.admissions = {};
    Object.assign(data.admissions, medKeys);
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
});

console.log('Medication keys added to all 25 language files!');
