import fs from 'fs';
import path from 'path';

function hasUIStrings(content) {
  // Check for string literals that look like UI text
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Skip imports, comments, type definitions
    if (line.match(/^\s*(import|export|\/\/|\/\*|\*|type |interface |const |function )/)) {
      continue;
    }
    // Check for typical UI text patterns
    if (line.match(/["'](placeholder|aria-label|title|alt|content|text|label|value|required|disabled|loading|error|success)[^"']*["']/i)) {
      return true;
    }
    // Check for generic string content that looks like UI
    if (line.match(/["'](?!\$)[\w\s\-\.,:!?\(\)]{4,}["']/)) {
      return true;
    }
  }
  
  return false;
}

function hasUseTranslation(content) {
  return /useTranslation|i18n|getI18n|t\(/.test(content);
}

function getLineCount(content) {
  return content.split('\n').length;
}

const uiDir = 'src/components/ui';
const files = fs.readdirSync(uiDir);

const results = [];

for (const file of files) {
  if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
  if (file === 'index.ts' || file === 'use-toast.ts') continue;
  
  const fullPath = path.join(uiDir, file);
  const content = fs.readFileSync(fullPath, 'utf-8');
  
  const hasUI = hasUIStrings(content);
  const hasTrans = hasUseTranslation(content);
  const lines = getLineCount(content);
  
  let category = 'Utility';
  if (file.includes('dialog') || file.includes('modal')) category = 'Dialog';
  else if (file.includes('form')) category = 'Form';
  else if (file.includes('table') || file.includes('list')) category = 'Table';
  else if (file.includes('pagination')) category = 'Utility';
  else if (file.includes('alert')) category = 'Utility';
  else if (file.includes('toast')) category = 'Utility';
  
  results.push({
    category,
    path: fullPath,
    hasTranslation: hasTrans,
    hasUIStrings: hasUI,
    lineCount: lines
  });
}

results.sort((a, b) => a.category.localeCompare(b.category));

console.log('Category,File Path,Has useTranslation,Has UI Strings,Line Count');
for (const r of results) {
  console.log(`${r.category},${r.path},${r.hasTranslation ? 'yes' : 'no'},${r.hasUIStrings ? 'yes' : 'no'},${r.lineCount}`);
}
