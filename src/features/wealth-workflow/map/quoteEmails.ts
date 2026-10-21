/** Known insurer quote-request inboxes, keyed by app_integrations_catalog id. */
export const QUOTE_EMAIL_PRESETS: Record<string, string[]> = {
  discovery: ["discoverylifeinfo@discovery.co.za", "insureinfo@discovery.co.za"],
  momentum: ["myriad@momentum.co.za"],
  bidvest_life: ["clientcare@bidvestlife.co.za"],
  brightrock: ["service@brightrock.co.za"],
  old_mutual: ["inlandquotes@ominsure.co.za", "coastalquotes@ominsure.co.za", "agriquotes@ominsure.co.za", "service@omwealth.co.za"],
};

export const parseEmails = (s?: string | null) =>
  Array.from(new Set((s ?? "").split(/[;,\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean)));
