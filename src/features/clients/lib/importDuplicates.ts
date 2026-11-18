type RecordData = { name: string; id?: string; [key: string]: unknown };
export type ImportDecision = { status: 'new' | 'existing' | 'review'; reason: string };
const text = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const identity = (value: unknown) => text(value).replace(/[\s-]/g, '');
const name = (value: unknown) => {
  const valueText = text(value);
  const parts = valueText.split(',');
  return parts.length === 2 ? `${parts[1].trim()} ${parts[0].trim()}` : valueText;
};
const phone = (value: unknown) => {
  const digits = String(value ?? '').replace(/\D/g, '').replace(/^00/, '');
  return /^0\d{9}$/.test(digits) ? `27${digits.slice(1)}` : digits;
};
function normal(field: string, value: unknown): string {
  return field === 'name' ? name(value) : field === 'id_passport_number' ? identity(value)
    : field === 'phone' || field.endsWith('_phone') ? phone(value) : text(value);
}
const ignored = new Set(['id', 'user_id', 'first_name', 'last_name', 'created_at', 'updated_at']);
function supplied(record: RecordData) {
  return Object.entries(record).filter(([field,value]) => !ignored.has(field) && normal(field,value) !== '');
}
function unchanged(incoming: RecordData, saved: RecordData) {
  return supplied(incoming).every(([field,value]) => normal(field,value) === normal(field,saved[field]));
}
function fingerprint(record: RecordData) {
  return JSON.stringify(supplied(record).map(([field,value]) => [field,normal(field,value)]).sort(([a],[b]) => a.localeCompare(b)));
}
function keys(record: RecordData) {
  return [['id',identity(record.id_passport_number)],['email',text(record.email)],['phone',phone(record.phone)],['name',name(record.name)]]
    .filter(([,value]) => value).map(([field,value]) => `${field}:${value}`);
}
function index(records: RecordData[]) {
  const result = new Map<string, number[]>();
  records.forEach((record,i) => keys(record).forEach(key => result.set(key,[...(result.get(key) ?? []),i])));
  return result;
}
function matches(record: RecordData, lookup: Map<string,number[]>) {
  return [...new Set(keys(record).flatMap(key => lookup.get(key) ?? []))];
}

// Conservative candidate detection: shared contact/name never authorises a merge.
export function planClientImport(incoming: RecordData[], existing: RecordData[]): ImportDecision[] {
  const savedIndex = index(existing), batchIndex = index(incoming);
  return incoming.map((record,i) => {
    const saved = matches(record,savedIndex);
    if (saved.length) {
      const candidate = existing[saved[0]];
      const sameIdentity = identity(record.id_passport_number) && identity(record.id_passport_number) === identity(candidate.id_passport_number);
      const sameNameAndContact = name(record.name) === name(candidate.name) && (
        (text(record.email) && text(record.email) === text(candidate.email)) ||
        (phone(record.phone) && phone(record.phone) === phone(candidate.phone)) ||
        (text(record.dob) && text(record.dob) === text(candidate.dob))
      );
      const exact = saved.length === 1 && (sameIdentity || sameNameAndContact) && unchanged(record,candidate);
      return {status: exact ? 'existing' : 'review', reason: exact ? 'Already present; no changes' : 'Possible existing match or changed details; review required'};
    }
    const batch = matches(record,batchIndex).filter(other => other !== i);
    if (batch.some(other => fingerprint(incoming[other]) !== fingerprint(record))) {
      return {status:'review',reason:'Conflicting matching rows in this file'};
    }
    if (batch.some(other => other < i)) return {status:'existing',reason:'Repeated identical row in this file'};
    return {status:'new',reason:'No matching record found'};
  });
}
