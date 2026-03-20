

# Fix SheetJS (xlsx) Security Vulnerabilities

## Problem

The `xlsx` package (v0.18.5) has two known vulnerabilities:
- **Prototype Pollution** (GHSA-4r6h-8v6p-xvw6)
- **Regular Expression Denial of Service** (GHSA-5pgg-2g8v-p4x9)

The `xlsx` package is unmaintained and these vulnerabilities have no fix in the npm package. It is only used in `src/components/patients/PatientImport.tsx` for reading Excel/CSV files.

## Solution

Replace `xlsx` with `read-excel-file`, a lightweight, actively maintained alternative with no known vulnerabilities. It handles `.xlsx` reading well. For CSV files, we'll use manual parsing (already partially handled by the AI fallback).

### Changes

**`package.json`**
- Remove `xlsx` dependency
- Add `read-excel-file` (~50KB, no vulnerabilities)

**`src/components/patients/PatientImport.tsx`**
- Replace `import * as XLSX from "xlsx"` with `import readXlsxFile from 'read-excel-file'`
- Update `processExcelFile()`:
  - Use `readXlsxFile(file)` which returns rows as arrays (same shape as current `jsonData`)
  - For CSV fallback content, parse manually or send directly to AI
- The core logic (column mapping, AI fallback) stays the same — only the Excel reading layer changes

### Migration Detail

Current:
```ts
const data = await file.arrayBuffer();
const workbook = XLSX.read(data, { type: "array", cellDates: true });
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
```

New:
```ts
const rows = await readXlsxFile(file);
// rows is already an array of arrays — same shape as jsonData
```

For CSV fallback (where `XLSX.utils.sheet_to_csv` was used), we'll read the file as text and pass it directly to AI parsing.

| File | Change |
|------|--------|
| `package.json` | Swap `xlsx` → `read-excel-file` |
| `src/components/patients/PatientImport.tsx` | Update imports and Excel reading logic |

