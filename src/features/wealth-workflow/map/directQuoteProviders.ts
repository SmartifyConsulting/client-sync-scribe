export const SHORT_TERM_QUOTE_PROVIDERS = ["hollard_insure", "santam_insure"];
export const INVESTMENT_QUOTE_PROVIDERS = ["allan_gray", "fedgroup", "fnb_rmb", "ashburton_investments"];

export function directQuoteCategory(id: string) {
  if (SHORT_TERM_QUOTE_PROVIDERS.includes(id)) return "short_term";
  if (INVESTMENT_QUOTE_PROVIDERS.includes(id)) return "investments";
  return null;
}
