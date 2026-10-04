/** Date of birth (YYYY-MM-DD) from a 13-digit South African ID number, or null. */
export function dobFromSaId(id: string): string | null {
  const d = (id ?? "").replace(/\s/g, "");
  if (!/^\d{13}$/.test(d)) return null;
  const yy = +d.slice(0, 2), mm = +d.slice(2, 4), dd = +d.slice(4, 6);
  const cur = new Date().getFullYear() % 100;
  const year = yy <= cur ? 2000 + yy : 1900 + yy;
  const dt = new Date(Date.UTC(year, mm - 1, dd));
  if (dt.getUTCMonth() !== mm - 1 || dt.getUTCDate() !== dd) return null;
  return `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}
