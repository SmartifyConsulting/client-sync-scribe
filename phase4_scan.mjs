import fs from 'fs';
import path from 'path';

// Phase 4 file patterns
const phase4Patterns = [
  '*Dialog.tsx',
  '*Modal.tsx',
  '*Form.tsx',
  '*Table.tsx',
  '*List.tsx'
];

// Directories to scan
const scanDirs = [
  'src/components/shared',
  'src/components/ui',
  'src/components/admissions',
  'src/components/appointments',
  'src/components/auth',
  'src/components/doctor',
  'src/components/documents',
  'src/components/patient',
  'src/components/patients',
  'src/components/permissions',
  'src/components/rewards',
  'src/components/sessions',
  'src/components/templates',
  'src/features/admin/components',
  'src/features/appointments/components',
  'src/features/documents/components',
  'src/features/documents/templates',
  'src/features/patients/components',
  'src/features/rewards/components',
  'src/features/sessions/admissions',
  'src/features/sessions/components',
  'src/modules/holarchelp/components',
  'src/modules/holarchelp/pages/provider/hospital'
];

function getCategory(filePath) {
  if (filePath.includes('Dialog') || filePath.includes('Modal')) return 'Dialog';
  if (filePath.includes('Form')) return 'Form';
  if (filePath.includes('Table') || filePath.includes('List')) return 'Table';
  if (filePath.includes('shared') || filePath.includes('/ui/')) return 'Utility';
  return 'Other';
}

function isReExport(content) {
  return /^\s*export\s+\*\s+from\s+/.test(content.trim());
}

function hasUIStrings(content) {
  // Check for string literals that look like UI text
  // Exclude imports, type definitions, etc.
  const lines = content.split('\n');
  let hasStrings = false;
  
  for (const line of lines) {
    // Skip imports, comments, type definitions
    if (line.match(/^\s*(import|export|\/\/|\/\*|\*|type|interface|const\s+\w+\s*[:=]\s*\{)/)) {
      continue;
    }
    // Check for string literals that are likely UI text
    if (line.match(/["'](?!.*\$)[^"']{3,}["']/)) {
      hasStrings = true;
      break;
    }
  }
  
  return hasStrings;
}

function hasUseTranslation(content) {
  return /useTranslation|i18n|getI18n|t\(/.test(content);
}

function getLineCount(content) {
  return content.split('\n').length;
}

const results = [];

for (const dir of scanDirs) {
  if (!fs.existsSync(dir)) continue;
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
    
    const fullPath = path.join(dir, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    // Skip re-exports and type definitions
    if (isReExport(content) || file.endsWith('.d.ts') || file.endsWith('.test.tsx')) {
      continue;
    }
    
    // Check if it matches Phase 4 patterns
    let isPhase4 = false;
    for (const pattern of phase4Patterns) {
      const regex = new RegExp(pattern.replace('*', ''));
      if (regex.test(file)) {
        isPhase4 = true;
        break;
      }
    }
    
    // Also include UI component files from shared and ui directories
    if (dir.includes('shared') || dir.includes('/ui/')) {
      if (file !== 'index.ts' && file !== 'use-toast.ts') {
        isPhase4 = true;
      }
    }
    
    if (!isPhase4) continue;
    
    const category = getCategory(fullPath);
    const hasUI = hasUIStrings(content);
    const hasTrans = hasUseTranslation(content);
    const lines = getLineCount(content);
    
    // Only include if it has UI strings OR is a component we identified
    if (hasUI) {
      results.push({
        category,
        path: fullPath,
        hasTranslation: hasTrans,
        hasUIStrings: hasUI,
        lineCount: lines
      });
    }
  }
}

// Sort and output
results.sort((a, b) => a.category.localeCompare(b.category));

console.log('Category,File Path,Has useTranslation,Has UI Strings,Line Count');
for (const r of results) {
  console.log(`${r.category},${r.path},${r.hasTranslation ? 'yes' : 'no'},${r.hasUIStrings ? 'yes' : 'no'},${r.lineCount}`);
}
