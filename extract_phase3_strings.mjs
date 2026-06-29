import fs from 'fs';
import path from 'path';

const phase3Screens = [
  'src/pages/Landing.tsx',
  'src/pages/Auth.tsx',
  'src/pages/Notifications.tsx',
  'src/pages/Profile.tsx',
  'src/pages/Legal.tsx',
  'src/pages/Connections.tsx',
];

const stringPatterns = [
  /["']([^"']*[a-zA-Z0-9])['"]/g, // quoted strings
  />([^<>]*[a-zA-Z0-9])</g, // text in JSX tags
  /placeholder=["']([^"']+)['"]/g, // placeholders
  /title=["']([^"']+)['"]/g, // titles
];

const excludePatterns = [
  /^https?:\/\//,
  /^\d+$/,
  /^[a-z0-9_-]{36}$/, // UUID
  /^\/[a-z0-9/_-]+$/i, // paths
];

let allStrings = {};

console.log('📊 Extracting Phase 3 strings...\n');

for (const screenFile of phase3Screens) {
  if (!fs.existsSync(screenFile)) continue;
  
  const content = fs.readFileSync(screenFile, 'utf8');
  const basename = path.basename(screenFile, '.tsx').toLowerCase();
  const key = basename === 'landing' ? 'landing' : basename;
  
  allStrings[key] = {};
  
  // Extract quoted strings
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Skip comments and imports
    if (line.trim().startsWith('//') || line.trim().startsWith('import')) return;
    if (line.trim().startsWith('const') && line.includes('=')) return;
    
    // Find quoted strings
    const matches = line.matchAll(/["']([^"']{3,100})['"]/g);
    for (const match of matches) {
      const str = match[1].trim();
      if (str.length > 2 && !excludePatterns.some(p => p.test(str))) {
        const keyName = str.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
        allStrings[key][keyName] = str;
      }
    }
  });
}

console.log(`✅ Found ${Object.keys(allStrings).length} screens with potential strings`);
console.log('\nSample extracted strings:');
Object.entries(allStrings).slice(0, 2).forEach(([screen, strings]) => {
  const sample = Object.entries(strings).slice(0, 3);
  console.log(`\n${screen}:`);
  sample.forEach(([k, v]) => console.log(`  ${k}: "${v}"`));
});

console.log('\n⚠️  NOTE: Manual review needed. Script found candidates; not all need translation.');
