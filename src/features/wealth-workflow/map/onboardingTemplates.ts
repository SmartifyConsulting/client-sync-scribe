/** Draft Disclosure Agreement and LOA templates. Wording is a placeholder for the firm to replace. */
const wrap = (title: string, body: string) => `<div id="holarc-document" style="font-family:Georgia,serif;color:#1f2937;padding:40px;font-size:13px;line-height:1.6">
<h1 style="font-size:18px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 4px">${title}</h1>
<p style="color:#64748b;margin:0 0 20px;font-size:11px">Holarc Wealth (Pty) Ltd · Authorised Financial Services Provider · FSP No. [to be confirmed]</p>${body}</div>`;

export function disclosureHtml(client: string, date: string) {
  return wrap("Disclosure Agreement", `
<p>This agreement is between <b>Holarc Wealth (Pty) Ltd</b> ("the FSP") and <b>${client}</b> ("the client"), dated ${date}.</p>
<h3>1. About the FSP</h3><p>The FSP is authorised under the Financial Advisory and Intermediary Services Act, 2002 (FAIS) to give advice and render intermediary services on long-term insurance, short-term insurance and investment products.</p>
<h3>2. Your Wealth Manager</h3><p>Your Wealth Manager acts under the supervision of the FSP's Key Individual and holds the qualifications required by FAIS.</p>
<h3>3. How we are paid</h3><p>We may earn commission set by legislation, an advice fee agreed with you in writing, or both. All costs will be shown in your Record of Advice before you decide.</p>
<h3>4. Conflicts of interest</h3><p>Our conflict of interest management policy is available on request. We do not accept gifts or incentives that could influence our advice.</p>
<h3>5. Complaints</h3><p>Complaints can be sent to the FSP's compliance officer. If unresolved, you may contact the FAIS Ombud.</p>
<h3>6. Privacy</h3><p>Your personal information is processed in line with the Protection of Personal Information Act (POPIA) and only for the purpose of providing financial services to you.</p>
<p>By signing, I confirm that I have read and understood this disclosure.</p>`);
}

export function loaHtml(client: string, date: string) {
  return wrap("Letter of Authority (LOA)", `
<p>I, <b>${client}</b>, dated ${date}, authorise <b>Holarc Wealth (Pty) Ltd</b> and its appointed Wealth Managers to:</p>
<ol><li>Request and receive information on all my existing life, disability, short-term, investment and retirement products from any product supplier, including through Astute.</li>
<li>Obtain policy schedules, values, beneficiary nominations and claims history.</li>
<li>Act as my appointed intermediary for the purpose of advice on these products.</li></ol>
<p>This authority remains valid until I cancel it in writing. A copy of this letter is as valid as the original.</p>
<p>By signing, I give this authority.</p>`);
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
