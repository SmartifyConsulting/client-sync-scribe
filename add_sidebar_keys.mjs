import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const newKeys = {
    "components": {
        "sidebar": {
            "toggleSidebar": "Toggle Sidebar"
        }
    }
};

const localeDir = path.join(__dirname, 'src/i18n/locales');
const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
    const filePath = path.join(localeDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    const data = JSON.parse(content);
    if (!data.components) data.components = {};
    if (!data.components.sidebar) data.components.sidebar = {};
    Object.assign(data.components.sidebar, newKeys.components.sidebar);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
});

console.log('✓ All locale files updated with sidebar keys');
