export const SHORT_TERM_QUOTE_PROVIDERS = ["hollard_insure", "santam_insure"];
export const INVESTMENT_QUOTE_PROVIDERS = ["allan_gray", "fedgroup", "fnb_rmb", "ashburton_investments"];

export function directQuoteCategory(id: string) {
  if (SHORT_TERM_QUOTE_PROVIDERS.includes(id)) return "short_term";
  if (INVESTMENT_QUOTE_PROVIDERS.includes(id)) return "investments";
  return null;
}

/** Public product references for broker preparation. Portal controls still require verification. */
export const DIRECT_QUOTE_ROUTES: Record<string, { product: string; href: string }[]> = {
  hollard_insure: [
    { product: "Easy Car & Home broker guide", href: "https://www.hollard.co.za/binaries/content/assets/hollardcoza/pages/brokers/client-portal/easy-brokers-comms/easy-car--home---product-brochure.pdf" },
    { product: "Easy Portable Possessions", href: "https://www.hollard.co.za/binaries/content/assets/hollardcoza/pages/brokers/client-portal/product-documentation/hollard---easy_portable-possessions.pdf" },
  ],
  santam_insure: [
    { product: "Car insurance", href: "https://www.santam.co.za/insurance/for-me/car/" },
    { product: "Home contents and portable items", href: "https://www.santam.co.za/insurance/for-me/home-contents/" },
  ],
  allan_gray: [
    { product: "Investment platform forms and product documents", href: "https://www.allangray.co.za/forms-and-documents/" },
    { product: "Retirement annuity", href: "https://www.allangray.co.za/what-we-offer/retirement/" },
  ],
  fedgroup: [
    { product: "Secured Investment", href: "https://www.fedgroup.co.za/investments/secured-investment" },
    { product: "Endowment", href: "https://www.fedgroup.co.za/investments/endowments" },
  ],
  fnb_rmb: [
    { product: "FNB savings and investment products", href: "https://www.fnb.co.za/save-and-invest/specialised/Ashburton/index.html" },
  ],
  ashburton_investments: [
    { product: "South African investment team", href: "https://www.ashburtoninvestments.com/za/contact-us" },
    { product: "Living Annuity product form", href: "https://www.ashburtoninvestments.com/docs/default-source/document-library/forms/south-africa/ashburton-living-annuity/ashburton_living_annuity_applicatione225a3a2a9fb472ca9b8d5abddad7ba9.pdf?sfvrsn=9edee427_2" },
  ],
};
