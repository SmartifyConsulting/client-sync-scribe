import fs from 'fs';
import path from 'path';

const categories = {
  patient: [],
  doctor: [],
  admin: [],
  emergency: [],
  other: []
};

const pagesDir = 'src/pages';

function getLineCount(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    
    if (stat.isDirectory()) {
      walkDir(filepath);
    } else if (file.endsWith('.tsx')) {
      const lines = getLineCount(filepath);
      const relPath = filepath.replace(/\/g, '/');
      
      if (filepath.includes('patient/')) {
        categories.patient.push({ file: relPath, lines });
      } else if (filepath.includes('doctor/')) {
        categories.doctor.push({ file: relPath, lines });
      } else if (filepath.includes('admin/')) {
        categories.admin.push({ file: relPath, lines });
      } else if (filepath.includes('emergency') || filepath.includes('dispatch') || filepath.includes('sos')) {
        categories.emergency.push({ file: relPath, lines });
      } else if (relPath.includes('MyPractice') || relPath.includes('DoctorRewards') || relPath.includes('Invoices')) {
        categories.doctor.push({ file: relPath, lines });
      } else {
        categories.other.push({ file: relPath, lines });
      }
    }
  }
}

walkDir(pagesDir);

// Print results
console.log('=== PATIENT SCREENS ===');
categories.patient.forEach(f => console.log(`${f.file} (${f.lines} lines)`));
console.log(`Total: ${categories.patient.length} files, ${categories.patient.reduce((a, f) => a + f.lines, 0)} lines\n`);

console.log('=== DOCTOR/PROVIDER SCREENS ===');
categories.doctor.forEach(f => console.log(`${f.file} (${f.lines} lines)`));
console.log(`Total: ${categories.doctor.length} files, ${categories.doctor.reduce((a, f) => a + f.lines, 0)} lines\n`);

console.log('=== ADMIN SCREENS ===');
categories.admin.forEach(f => console.log(`${f.file} (${f.lines} lines)`));
console.log(`Total: ${categories.admin.length} files, ${categories.admin.reduce((a, f) => a + f.lines, 0)} lines\n`);

console.log('=== EMERGENCY/DISPATCH SCREENS ===');
if (categories.emergency.length === 0) {
  console.log('(None found)');
} else {
  categories.emergency.forEach(f => console.log(`${f.file} (${f.lines} lines)`));
}

console.log('\n=== OTHER SCREENS ===');
categories.other.forEach(f => console.log(`${f.file} (${f.lines} lines)`));
