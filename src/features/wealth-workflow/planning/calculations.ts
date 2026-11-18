export const CALCULATION_VERSION = "eft-planning-1";

function finite(value: number, label: string) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be a finite number.`);
}

function inputs(balance: number, rate: number, periods: number) {
  finite(balance, "Amount");
  finite(rate, "Rate");
  if (balance < 0 || rate <= -1) throw new Error("Use a non-negative amount and a periodic rate above -100%.");
  if (!Number.isInteger(periods) || periods <= 0 || periods > 1200) throw new Error("Use between 1 and 1,200 whole periods.");
}

export function realReturn(nominal: number, inflation: number) {
  finite(nominal, "Return");
  finite(inflation, "Inflation");
  if (nominal <= -1 || inflation <= -1) throw new Error("Return and inflation must exceed -100%.");
  return (1 + nominal) / (1 + inflation) - 1;
}

function growth(rate: number, periods: number) {
  const exponent = periods * Math.log1p(rate);
  return { factor: Math.exp(exponent), series: rate === 0 ? periods : Math.expm1(exponent) / rate };
}

export function futureValue(initial: number, contribution: number, rate: number, periods: number) {
  inputs(initial, rate, periods);
  finite(contribution, "Contribution");
  if (contribution < 0) throw new Error("Contributions must be non-negative.");
  const { factor, series } = growth(rate, periods);
  const result = initial * factor + contribution * series;
  finite(result, "Projected value");
  return result;
}

export function savingsContribution(initial: number, target: number, rate: number, periods: number) {
  inputs(initial, rate, periods);
  finite(target, "Target");
  if (target < 0) throw new Error("The target must be non-negative.");
  const { factor, series } = growth(rate, periods);
  const result = Math.max(0, (target - initial * factor) / series);
  finite(result, "Required contribution");
  return result;
}

export function presentValue(payment: number, rate: number, periods: number) {
  inputs(payment, rate, periods);
  const result = payment * (rate === 0 ? periods : -Math.expm1(-periods * Math.log1p(rate)) / rate);
  finite(result, "Required capital");
  return result;
}

export function loanPayment(principal: number, rate: number, periods: number) {
  inputs(principal, rate, periods);
  const result = principal / presentValue(1, rate, periods);
  finite(result, "Payment");
  return result;
}

export function estateDuty(property: number, deductions: number, abatement: number) {
  for (const value of [property, deductions, abatement]) {
    finite(value, "Estate amount");
    if (value < 0) throw new Error("Estate amounts must be non-negative.");
  }
  const dutiable = Math.max(0, property - deductions - abatement);
  return { dutiable, duty: Math.min(dutiable, 30_000_000) * 0.2 + Math.max(0, dutiable - 30_000_000) * 0.25 };
}
