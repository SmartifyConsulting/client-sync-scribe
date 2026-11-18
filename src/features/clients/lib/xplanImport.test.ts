import { describe, expect, it } from 'vitest';
import { isXplanList, mapXplanRow, parseCsv, xplanBirthDate } from './xplanImport';

describe('Xplan client list mapping', () => {
  const headers = ['Name','First Name','Date of Birth (sort by dd/mmm/yyyy)','Date of Birth (sort by dd/mmm)','Adviser','ID','Phone','Email','Address','Category','Policy number'];
  it('maps only required client fields, retaining identifier text and full-year birth date', () => {
    const {client, warnings} = mapXplanRow(headers, ['Example, Jane','Jane','28 Oct 1988','wrong','Broker','0012345678901','0820000000','jane@example.test',"[['Residential:12 Demo road\\nUnit 3, ', 'Demo Town, ZA']]",'AAA Client','POL123']);
    expect(isXplanList(headers)).toBe(true);
    expect(client).toEqual({name:'Jane Example',first_name:'Jane',last_name:'Example',dob:'1988-10-28',id_passport_number:'0012345678901',phone:'0820000000',email:'jane@example.test',physical_address:'12 Demo road, Unit 3, Demo Town, ZA'});
    expect(warnings).toEqual([]);
    expect(client).not.toHaveProperty('medical_aid_number');
    expect(client).not.toHaveProperty('status');
  });
  it('preserves CSV commas, escaped quotes, BOM and quoted multiline fields', () => {
    expect(parseCsv('\uFEFFName,Notes\r\n"Example, Jane","Said ""hello""\nNext line"\r\n')).toEqual([['Name','Notes'],['Example, Jane','Said "hello"\nNext line']]);
    expect(() => parseCsv('Name\n"unfinished')).toThrow();
  });
  it('flags invalid dates and ambiguous addresses instead of guessing', () => {
    expect(xplanBirthDate('31 Feb 2026')).toBeUndefined();
    expect(xplanBirthDate('29 Feb 2024')).toBe('2024-02-29');
    const result = mapXplanRow(headers, ['Example, Jane','Jane','31 Feb 2026','','','','','',"[['Residential:a'], ['Postal:b']]"]);
    expect(result.client.dob).toBeUndefined();
    expect(result.client.physical_address).toBeUndefined();
    expect(result.warnings).toContain('Address needs review');
  });
});
