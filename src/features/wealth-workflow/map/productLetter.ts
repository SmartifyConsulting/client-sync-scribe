/** One-letter tick badge for a completed product quote (L = Life Cover, D = Dread Disease, …). */
const RULES: [RegExp, string][] = [
  [/dread|critical|severe illness/i, "D"],
  [/income/i, "I"],
  [/disab/i, "P"],
  [/car|motor|vehicle/i, "C"],
  [/home|house|building|household/i, "H"],
  [/funeral/i, "F"],
  [/medical|gap|health/i, "M"],
  [/retire|annuit/i, "R"],
  [/invest|savings/i, "S"],
  [/life/i, "L"],
];
export function productLetter(product: string): string {
  return RULES.find(([re]) => re.test(product))?.[1] ?? (product.trim()[0] ?? "?").toUpperCase();
}
