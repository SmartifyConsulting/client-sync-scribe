import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const vulaKeys = {
    "headline": "Vula means rain in isiZulu and isiXhosa",
    "languages": "isiZulu and isiXhosa",
    "tagline": "— something you can't always predict, but always need.",
    "section1Title": "Vulas reward real-world actions —",
    "section1Desc": "caring, helping, sharing, contributing, and following through.",
    "section1Tagline": "It's how we show up for each other.",
    "section2Title": "Vulas are a simple way to start building value for the future.",
    "cta": "See where I can use my Vulas",
    "footerTagline": "Earn them. Use them. Keep them."
};

const localeDir = path.join(__dirname, 'src/i18n/locales');
const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.json'));

console.log(`Adding Vula keys to ${files.length} language files...`);

files.forEach(file => {
    const filePath = path.join(localeDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Remove BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    
    const data = JSON.parse(content);
    
    // Ensure rewards.vula structure exists
    if (!data.rewards) data.rewards = {};
    if (!data.rewards.vula) data.rewards.vula = {};
    if (!data.rewards.vula.explainer) data.rewards.vula.explainer = {};
    
    // Add vula explainer keys
    Object.assign(data.rewards.vula.explainer, vulaKeys);
    
    // Write back
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
    console.log(`✓ ${file}`);
});

console.log('\nVula keys added successfully!');
