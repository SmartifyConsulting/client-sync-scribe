/** Draft Disclosure Agreement and LOA templates. Wording is a placeholder for the firm to replace. */
const NAVY = "#0f2742", INK = "#1e293b", MUTED = "#64748b", RULE = "#d8dee8";
const esc = (x: unknown) => String(x ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const logo = (u?: string | null) => (u ? `<img src="${esc(u)}" alt="" style="max-height:46px;max-width:170px;object-fit:contain"/>` : "");
const footer = (p: any) => p?.fsp_name
  ? `${esc(p.fsp_name)} · Reg No ${esc(p.registration_number ?? "–")} · FSP ${esc(p.fsb_licence ?? "–")}<br/>${esc(p.firm_address ?? "")}${p.website ? " · " + esc(p.website) : ""}`
  : "Masthead Financial Planning (Proprietary) Limited · Reg No 2010/019601/07 · FSP 43435<br/>1st Floor Park Terraces, Golf Park, Mowbray 7700 · www.mastheadfp.co.za";
const wrap = (title: string, subtitle: string, body: string, p: any = null) => `<div id="holarc-document" style="font-family:'Helvetica Neue',Arial,sans-serif;color:${INK};background:#fff;padding:56px 60px;font-size:12.5px;line-height:1.7;max-width:820px;margin:0 auto">
${p?.__businessLogo || p?.__fspLogo ? `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:22px">${logo(p.__businessLogo) || "<span></span>"}${logo(p.__fspLogo)}</div>` : ""}
<div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid ${NAVY};padding-bottom:14px;margin-bottom:28px">
<div><p style="margin:0;font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:${MUTED}">${subtitle}</p>
<h1 style="margin:6px 0 0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:26px;color:${NAVY};letter-spacing:.01em">${title}</h1></div>
<p style="margin:0;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:${NAVY};font-weight:600">Holarc Wealth</p></div>
${body}
<div style="margin-top:36px;padding-top:12px;border-top:1px solid ${RULE};font-size:9.5px;color:${MUTED};text-align:center;line-height:1.5">${footer(p)}</div></div>`;
const h2 = (t: string) => `<h2 style="margin:26px 0 10px;font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:${NAVY};font-weight:600">${t}</h2>`;
const table = (rows: [string, string][]) => `<table style="width:100%;border-collapse:collapse;font-size:12px">${rows.map(([k, v]) => `<tr><td style="width:36%;padding:8px 12px 8px 0;border-bottom:1px solid ${RULE};color:${MUTED};vertical-align:top">${k}</td><td style="padding:8px 0;border-bottom:1px solid ${RULE};vertical-align:top">${v}</td></tr>`).join("")}</table>`;

export function disclosureHtml(client: string, date: string, p: any = null) {
  return wrap("Disclosure Agreement", "FAIS disclosure", `
<p>This agreement is between <b>Holarc Wealth (Pty) Ltd</b> ("the FSP") and <b>${client}</b> ("the client"), dated ${date}.</p>
<h3 style="margin:20px 0 6px;font-size:13px;color:#0f2742;font-weight:600">1. About the FSP</h3><p>The FSP is authorised under the Financial Advisory and Intermediary Services Act, 2002 (FAIS) to give advice and render intermediary services on long-term insurance, short-term insurance and investment products.</p>
<h3 style="margin:20px 0 6px;font-size:13px;color:#0f2742;font-weight:600">2. Your Wealth Manager</h3><p>Your Wealth Manager acts under the supervision of the FSP's Key Individual and holds the qualifications required by FAIS.</p>
<h3 style="margin:20px 0 6px;font-size:13px;color:#0f2742;font-weight:600">3. How we are paid</h3><p>We may earn commission set by legislation, an advice fee agreed with you in writing, or both. All costs will be shown in your Record of Advice before you decide.</p>
<h3 style="margin:20px 0 6px;font-size:13px;color:#0f2742;font-weight:600">4. Conflicts of interest</h3><p>Our conflict of interest management policy is available on request. We do not accept gifts or incentives that could influence our advice.</p>
<h3 style="margin:20px 0 6px;font-size:13px;color:#0f2742;font-weight:600">5. Complaints</h3><p>Complaints can be sent to the FSP's compliance officer. If unresolved, you may contact the FAIS Ombud.</p>
<h3 style="margin:20px 0 6px;font-size:13px;color:#0f2742;font-weight:600">6. Privacy</h3><p>Your personal information is processed in line with the Protection of Personal Information Act (POPIA) and only for the purpose of providing financial services to you.</p>
<p>By signing, I confirm that I have read and understood this disclosure.</p>`);
}

export function loaHtml(client: string, date: string, p: any = null) {
  const v = (k: string, d: string) => (p?.[k] != null && p[k] !== "" ? String(p[k]) : d);
  const sup = p?.product_suppliers;
  const defaultCats = ["1.1 Long-term Insurance – Category A","1.2 Short-term Insurance Personal Lines","1.3 Long-term Insurance – Category B1","1.4 Long-term Insurance – Category C","1.5 Retail Pension Benefits","1.6 Short-term Insurance Commercial Lines","1.7 Pension Fund Benefits","1.14 Participatory interests in Collective Investment Schemes","1.20 Long-term Insurance – Category B2","1.21 Long-term Insurance – Category B2-A","1.22 Long-term Insurance – Subcategory B1-A","1.23 Short-term Insurance Personal Lines A-1"];
  const cats: string[] = p?.fsca_categories?.length ? p.fsca_categories : defaultCats;
  const col = (t: string, items: string[]) => `<td style="vertical-align:top;padding:0 12px 0 0;width:33%"><p style="margin:0 0 6px;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:${MUTED}">${t}</p>${items.map((i) => `<div style="padding:3px 0;border-bottom:1px solid ${RULE}">${i}</div>`).join("")}</td>`;
  return wrap("Introduction &amp; Letter of Authority", "Prepared for " + client + " · " + date, `
${h2("Your planner")}
${table([
  ["Planner", `${v("title", "Mr")} ${v("planner_name", "Marlin Moodley")}`],
  ["Postal address", v("postal_address", "49 Kenneth Road, Oak Park, Pietermaritzburg")],
  ["Telephone", v("phone", "082 323 4472")],
  ["Email", [v("email_primary", "mmoodley@mastheadfp.co.za"), v("email_secondary", "marlin@marlinmoodley.co.za")].join(" · ")],
  ["Planner status", v("planner_status", "Representative of the FSP by mandate")],
  ["Authorised FSCA product categories", cats.join("<br/>")],
  ["PI cover", p ? (p.pi_cover ? "Yes" : "No") : "Yes"],
  ["Highest qualification", v("qualification", "Higher Diploma in Business Management")],
  ["Experience", `${v("experience_years", "17")} years`],
])}
${h2("The financial services provider")}
${table([
  ["FSP and legal status", v("fsp_legal_status", "Masthead Financial Planning (Pty) Ltd is a private company and licensed Financial Services Provider (FSP) which accepts responsibility for the business activities of the above representative and planner.")],
  ["Licence and registration", `FSP Licence No. ${v("fsb_licence", "43435")} · Reg. No. ${v("registration_number", "2010/019601/07")} · Tel ${v("firm_phone", "0861 737 858")}`],
  ["Conflict of interest", v("conflict_policy", "In accordance with legislation the FSP has implemented a Conflict of Interest Management Policy and keeps an updated disclosure register. This register informs you of all financial and ownership interests that the FSP/representative may become entitled to and lists the business relationships with product suppliers. It is available for inspection.")],
  ["Compliance officer", `${v("compliance_officer", "Masthead (Pty) Ltd")} · Tel ${v("compliance_phone", "(021) 686 3588")} · Fax ${v("compliance_fax", "(021) 686 3589")} · ${v("compliance_email", "compliance@masthead.co.za")}`],
  ["Complaints", v("complaints_address", "Complaints must be addressed to the FSP in writing at P.O. Box 765, Howard Place, 7540. A copy of the FSP's Complaint Process is available on request.")],
])}
${h2("Product suppliers of the representative")}
<table style="width:100%;border-collapse:collapse;font-size:11.5px"><tr>
${col("Short term", sup?.short_term?.length ? sup.short_term : ["Momentum Insure","Old Mutual Insure","Discovery Insure","One","CIA","ITOO","Safire","Brolink","Santam"])}
${col("Life", sup?.life?.length ? sup.life : ["Momentum","Discovery","Bidvest","Old Mutual","PPS","Brightrock","Sanlam","Liberty"])}
${col("Investments", sup?.investments?.length ? sup.investments : ["Momentum Wealth","Discovery Invest","Sygnia","Old Mutual Wealth","PPS Invest","Allan Gray","Glacier","Liberty"])}
</tr></table>
<p style="margin:14px 0 0;font-size:11.5px;color:${MUTED}">${v("remuneration_basis", "Representatives are remunerated by means of commission paid by the product suppliers.")} ${v("shareholding_statement", "The FSP does not hold more than 10% share in any of its product suppliers.")} ${(p?.top_suppliers?.length ? p.top_suppliers : [{ name: "Old Mutual", percent: 32 }]).length ? "Product suppliers from which the FSP received more than 30% of total remuneration during the preceding 12 months: " + (p?.top_suppliers?.length ? p.top_suppliers : [{ name: "Old Mutual", percent: 32 }]).map((t: any) => `${t.name} (${t.percent ?? "–"}%)`).join(", ") + "." : ""}</p>
${h2("Authority to view, obtain and share your information")}
<div style="font-family:Georgia,serif;font-size:13px;line-height:1.8">
<p>I hereby acknowledge the following in my personal capacity:</p>
<p>Sound and proper financial advice can only be provided with full disclosure of relevant information relating to appropriate personal, including private, information for the purposes of determining and advising on my/our financial situation and financial product experience and objectives, in the process of acquiring, servicing or maintaining any financial products, including but not limited to any information relating to or interest in any long-term insurance, unit trust or any other financial products or services, with any long-term insurer, unit trust manager or other financial institution.</p>
<p>I accordingly confirm, for the purposes of providing the said sound and proper financial advice to me, that full permission and authority is granted to <b>${v("planner_name", "Marlin Moodley")}</b> of <b>${v("fsp_name", "Masthead Financial Planning")}</b> to obtain any and all such information via The Financial Services Exchange (Pty) Ltd, trading as Astute, or any other institution providing a mechanism for the transmission of such information.</p>
<p>I herewith give consent for the long-term insurer, short-term insurer and unit trust manager or other financial institution possessing such information to release such information to the said Authorised User via Astute, or any other mechanism; and I confirm that such Authorised User shall be acting on my behalf or in my interest and I waive any right to privacy only for the purposes as stated above.</p>
<p>I further acknowledge that this consent to obtain information on my behalf will remain effective until cancelled by me in writing.</p>
<p>I further confirm that I have read and understood the contents of the above.</p></div>
${h2("Client declaration")}
<p style="font-family:Georgia,serif;font-size:13px;line-height:1.8">I, <b>${client}</b>, hereby confirm that I have read and understood the contents of this document. I further confirm that all sections have been completed by me and reflect my intention.</p>`);
}

export function sealedHtml(doc: { content_html: string; signature_image: string; signer_name: string; signed_at: string; signer_ip: string | null; seal_hash: string; title: string }) {
  const at = new Date(doc.signed_at).toLocaleString("en-ZA");
  return `${doc.content_html}<div style="font-family:Arial,sans-serif;padding:0 40px 40px;color:#1f2937">
<div style="border-top:1px solid #cbd5e1;padding-top:16px;margin-top:8px"><img src="${doc.signature_image}" style="height:60px"/><p style="margin:4px 0;font-size:12px"><b>${doc.signer_name}</b> · Digitally signed ${at}</p></div>
<div style="border:1.5px solid #334155;border-radius:12px;padding:16px;margin-top:20px;font-size:11px">
<p style="text-align:center;letter-spacing:.2em;font-weight:bold;font-size:13px;margin:0 0 10px">SEAL CERTIFICATE</p>
<p>Document: ${doc.title}<br/>Signed by: ${doc.signer_name}<br/>Sealed: ${doc.signed_at}<br/>IP address: ${doc.signer_ip ?? "not recorded"}</p>
<p style="font-family:monospace;word-break:break-all;text-align:center">Seal ${doc.seal_hash}</p></div></div>`;
}
