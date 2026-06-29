import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const labKeys = {
    "lab": {
        "title": "Add Lab Result",
        "testName": "Test Name",
        "result": "Result",
        "units": "Units",
        "refRange": "Reference Range",
        "resultDate": "Result Date",
        "attachPdf": "Attach PDF",
        "attached": "Attached ✓",
        "notes": "Notes"
    }
};

const localeDir = path.join(__dirname, 'src/i18n/locales');
const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.json'));

console.log(`Adding Lab keys to ${files.length} language files...`);

files.forEach(file => {
    const filePath = path.join(localeDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    
    const data = JSON.parse(content);
    
    if (!data.admissions) data.admissions = {};
    Object.assign(data.admissions, labKeys);
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
    console.log(`✓ ${file}`);
});

console.log('\nLab keys added successfully!');
