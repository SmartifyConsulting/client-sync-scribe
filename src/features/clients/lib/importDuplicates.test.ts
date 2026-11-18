import { describe, expect, it } from 'vitest';
import { planClientImport } from './importDuplicates';
describe('client import duplicate checks', () => {
  it('classifies a 400-client batch and a repeat import without adding duplicates', () => {
    const records = Array.from({length:400},(_,i) => ({name:`Client ${i}`,id_passport_number:`ID${i}`}));
    expect(planClientImport(records,records.slice(0,45)).filter(row => row.status === 'new')).toHaveLength(355);
    expect(planClientImport(records,records).every(row => row.status === 'existing')).toBe(true);
  });
  it('holds conflicting names with the same ID for review', () => {
    expect(planClientImport([{name:'Penny Lane',id_passport_number:'123-45'}],[{name:'Georgia Demo',id_passport_number:'12345'}])[0].status).toBe('review');
  });
  it('handles normalised phones, changed fields, shared emails and missing IDs conservatively', () => {
    const saved = [{name:'Example, Jane',phone:'+27820000000',email:'Jane@example.test'}];
    expect(planClientImport([{name:'Jane Example',phone:'0820000000',email:'jane@example.test'}],saved)[0].status).toBe('existing');
    expect(planClientImport([{name:'Jane Example',dob:'1980-01-01'}],saved)[0].status).toBe('review');
    expect(planClientImport([{name:'John Example',email:'Jane@example.test'}],saved)[0].status).toBe('review');
    expect(planClientImport([{name:'Jane Example'}],saved)[0].status).toBe('review');
  });
  it('checks duplicates throughout the file before allowing either conflicting row', () => {
    const first = {name:'Jane Example',id_passport_number:'ID1'};
    expect(planClientImport([first,{...first}],[]).map(row => row.status)).toEqual(['new','existing']);
    expect(planClientImport([first,{...first,name:'Other Person'}],[]).map(row => row.status)).toEqual(['review','review']);
  });
});
