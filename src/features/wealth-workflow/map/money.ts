/** Rand amounts grouped in threes with plain spaces, e.g. "R 1 000 000.00". */
export const groupDigits = (raw: string): string => {
  const [int, dec] = String(raw ?? "").replace(/[^\d.]/g, "").split(".");
  const g = (int ?? "").replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return dec !== undefined ? `${g}.${dec.slice(0, 2)}` : g;
};

export const fmtR = (n?: number | string | null): string => {
  if (n == null || n === "" || isNaN(Number(n))) return "—";
  const [int, dec] = Math.abs(Number(n)).toFixed(2).split(".");
  return `${Number(n) < 0 ? "-" : ""}R ${int.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}.${dec}`;
};
