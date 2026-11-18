// Deterministic mapping of the observed Xplan Client List CSV; no network or writes.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
      row.push(cell.trim()); cell = '';
      if (char !== ',') {
        if (row.some(Boolean)) rows.push(row);
        row = [];
        if (char === '\r' && input[i + 1] === '\n') i++;
      }
    } else cell += char;
  }
  if (quoted) throw new Error('CSV contains an unfinished quoted field.');
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export const isXplanList = (headers: string[]) =>
  headers.includes('Date of Birth (sort by dd/mmm/yyyy)') && headers.includes('Adviser');

export function xplanBirthDate(value: string): string | undefined {
  const match = value.trim().match(/^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/);
  if (!match) return undefined;
  const month = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(match[2].toLowerCase()) + 1;
  const day = Number(match[1]), year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (!month || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function residentialAddress(value: string): string | undefined {
  if (!value.trim()) return undefined;
  if (!value.trim().startsWith('[[')) return value.trim();
  // Never execute Xplan's Python-style representation. Multiple addresses need review.
  if (/\]\s*,\s*\[/.test(value)) return undefined;
  const parts = [...value.matchAll(/'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"/g)]
    .map(match => (match[1] ?? match[2]).replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\'/g, "'").replace(/\\"/g, '"'));
  if (!parts.length || !/^Residential:/i.test(parts[0])) return undefined;
  return parts.join(' ').replace(/^Residential:/i, '').split(/[\n,]+/).map(part => part.trim()).filter(Boolean).join(', ');
}

export function mapXplanRow(headers: string[], row: unknown[]) {
  const read = (header: string) => String(row[headers.indexOf(header)] ?? '').trim();
  const sourceName = read('Name'), comma = sourceName.indexOf(',');
  const first_name = read('First Name') || (comma >= 0 ? sourceName.slice(comma + 1).trim() : '');
  const last_name = comma >= 0 ? sourceName.slice(0, comma).trim() : '';
  const rawDob = read('Date of Birth (sort by dd/mmm/yyyy)');
  const dob = xplanBirthDate(rawDob);
  const physical_address = residentialAddress(read('Address'));
  const warnings: string[] = [];
  if (rawDob && !dob) warnings.push('Date of birth needs review');
  if (read('Address') && !physical_address) warnings.push('Address needs review');
  if (!last_name) warnings.push('Separate surname needs review');
  return {
    client: {name: [first_name, last_name].filter(Boolean).join(' ') || sourceName, first_name, last_name,
      email: read('Email') || undefined, phone: read('Phone') || undefined, dob, physical_address,
      id_passport_number: read('ID') || undefined},
    warnings,
  };
}

export const XPLAN_MAPPED_COLUMNS = ['Name', 'First Name', 'Email', 'Phone', 'ID', 'Address', 'Date of Birth (sort by dd/mmm/yyyy)'];
