import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const uiDir = path.join(__dirname, 'src/components/ui');
const files = fs.readdirSync(uiDir).filter(f => f.endsWith('.tsx'));

const patterns = [
  { regex: /<span>([A-Z][^<]*)<\/span>/g, desc: 'span tags with text' },
  { regex: /aria-label="([^"]*)"/g, desc: 'aria-label attributes' },
  { regex: /placeholder="([^"]*)"/g, desc: 'placeholder attributes' },
  { regex: /title="([^"]*)"/g, desc: 'title attributes' },
];

files.forEach(file => {
  const filePath = path.join(uiDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  let found = [];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.regex.exec(content)) !== null) {
      found.push(`${pattern.desc}: "${match[1]}"`);
    }
  });
  
  if (found.length > 0) {
    console.log(`\n=== ${file} ===`);
    found.forEach(f => console.log(`  ${f}`));
  }
});
