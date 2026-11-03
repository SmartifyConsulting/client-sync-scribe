// Executed in the portal. Only demonstrated quote actions; never application acceptance or email.
function driveQuoteJourney(request, origin, discoveryRedirects) {
  const u = new URL(location.href);
  if (u.protocol !== "https:" || u.username || u.password || !(u.origin === origin || (typeof discoveryRedirects === "string" && !u.port && (u.hostname === discoveryRedirects || u.hostname.endsWith("." + discoveryRedirects))))) return { state: "blocked", detail: "Portal origin could not be verified." };
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const visible = (el) => el.getClientRects().length > 0 && !el.disabled && getComputedStyle(el).visibility !== "hidden";
  const controls = [...document.querySelectorAll("input, select, textarea")].filter((el) => visible(el) && !["hidden", "submit", "button", "file"].includes(el.type));
  if (controls.some((el) => el.type === "password" || el.autocomplete === "one-time-code")) return { state: "blocked", detail: "Portal verification is required. Reconnect to complete verification." };
  const actions = [...document.querySelectorAll('button, a, input[type=submit], input[type=button], [role=tab], [role=button]')].filter(visible);
  const label = (el) => norm(el.labels?.[0]?.textContent || el.getAttribute("aria-label") || el.placeholder);
  const matches = (el, names) => names.map(norm).includes(norm(el.value && el.tagName === "INPUT" ? el.value : el.textContent || el.getAttribute("aria-label")));
  const click = (names) => { const found = actions.filter((el) => matches(el, names)); if (found.length !== 1) return false; found[0].click(); return true; };
  const insurer = norm(request.insurer);
  const momentum = insurer.startsWith("momentum");
  const brightrock = insurer.startsWith("brightrock");
  if (insurer.startsWith("bidvest") || insurer === "fmi") return { state: "blocked", detail: "Bidvest quote screens were not demonstrated. Upload a broker-prepared PDF until its journey is mapped." };
  if (!momentum && !brightrock) return { state: "blocked", detail: "This insurer's quote journey still needs a verified field map." };
  const step = request.step || "start";
  if (step === "start") {
    // Part 2 p2 screenshot: "New cover proposal" (not "Create new quote").
    const names = brightrock && request.copy ? ["Copy", "Copy quote", "Copy proposal"] : momentum ? ["New Quote"] : ["New cover proposal", "Create new proposal or quote", "Create new proposal", "Create new quote"];
    if (click(names)) return { state: "navigate", next: "capture", detail: request.copy ? "Copying the saved scenario" : "Opening a new quote" };
    if (momentum && click(["Content Calculators", "Quotes & calculators"])) return { state: "navigate", next: "type", detail: "Opening Momentum calculators" };
    if (brightrock && !request.copy && click(["Quotes"])) return { state: "navigate", next: "start", detail: "Opening BrightRock quotes" };
    return { state: "blocked", detail: request.copy ? "A unique Copy action was not found. The original quote has not been changed." : "A unique new-quote action was not found. Open the provider's quote area and select the intended new case." };
  }
  if (step === "type") {
    // This demonstrated Momentum adapter supports insurance, not investment journeys.
    if (click(["Life insurance"])) return { state: "navigate", next: "launch", detail: "Selecting Life insurance" };
    return { state: "blocked", detail: "Momentum Life insurance control not found." };
  }
  if (step === "launch") {
    if (click(["Get a Quote"])) return { state: "navigate", next: "workspace", detail: "Waiting for the quote workspace" };
    return { state: "blocked", detail: "Get a Quote control not found." };
  }
  if (step === "workspace") {
    if (click(["New Quote"])) return { state: "navigate", next: "capture", detail: "Opening a fresh Momentum case" };
    return { state: "blocked", detail: "Waiting for a trusted quote workspace with New Quote." };
  }
  if (step === "report") {
    if (brightrock) return { state: "blocked", detail: "The BrightRock manual demonstrates email export only. Retrieve the report using the broker-approved process and upload its PDF; no email was sent." };
    if (momentum && click(["Generate Quote Report"])) return { state: "report", next: "download", detail: "Generating the Momentum quote report" };
    if (click(["Download PDF", "Download quote", "Download report"])) return { state: "download", detail: "Waiting for the quote PDF download" };
    return { state: "blocked", detail: "Report/download action not found. Review the calculated quote and upload its PDF; no email was sent." };
  }
  if (step === "download") {
    if (brightrock) return { state: "blocked", detail: "BrightRock PDF download controls were not demonstrated. Upload the broker-retrieved quote PDF for this scenario." };
    // Part 1 p6 screenshot: generic Download is permitted only after Momentum
    // Generate Quote Report has advanced this job into its download state.
    if (click(momentum ? ["Download", "Download PDF", "Download quote", "Download report"] : ["Download PDF", "Download quote", "Download report"])) return { state: "download", detail: "Waiting for the quote PDF download" };
    return { state: "blocked", detail: "Waiting for the generated report download. Upload manually if the portal uses an unsupported PDF source." };
  }
  let filled = 0;
  const missing = [];
  const fields = request.fields || [];
  const assigned = new Set();
  const readOnly = (el) => el.readOnly || el.getAttribute("aria-readonly") === "true";
  for (const el of controls) {
    if (readOnly(el)) continue;
    if (el.type === "radio") {
      const group = controls.filter(other => other.type === "radio" && (el.name ? other.name === el.name : other === el));
      if ((el.required || el.getAttribute("aria-required") === "true") && !group.some(other => other.checked)) missing.push("Required portal choice needs broker selection");
      continue;
    }
    const l = label(el);
    if (!l) { if (el.required && !el.value) missing.push("Unlabelled required field"); continue; }
    let candidates = fields.filter((f) => [f.label, ...(f.aliases || [])].map(norm).includes(l));
    if (candidates.length > 1) {
      const section = norm(el.closest('fieldset, [role=group], section')?.getAttribute("aria-label") || el.closest("fieldset")?.querySelector("legend")?.textContent);
      candidates = candidates.filter((f) => f.product && section.includes(norm(f.product)));
    }
    if (candidates.length > 1) { missing.push("Ambiguous product field"); continue; }
    const field = candidates[0];
    if (!field || field.value === "") { if (el.required || el.getAttribute("aria-required") === "true") missing.push("Required portal field needs broker input"); continue; }
    if (el.type === "checkbox") {
      // Only a supplied, explicitly selected benefit toggle may be changed.
      // Consent/application checkboxes are never inferred or clicked.
      if (field.kind !== "toggle" || !["true", "false"].includes(field.value)) { missing.push("Checkbox needs an approved benefit selection"); continue; }
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked")?.set;
      if (!setter) { missing.push("Unsupported checkbox control"); continue; }
      setter.call(el, field.value === "true");
    } else if (el.tagName === "SELECT") {
      const options = [...el.options].filter((o) => !o.disabled && norm(o.textContent) === norm(field.value));
      if (options.length !== 1) { missing.push("Selected option is not available"); continue; }
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
      if (!setter) { missing.push("Unsupported select control"); continue; }
      setter.call(el, options[0].value);
    } else {
      const prototype = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      if (!setter) { missing.push("Unsupported input control"); continue; }
      const value = ["amount", "number", "percent"].includes(field.kind) ? field.value.replace(/[ ,R%]/g, "") : field.value;
      setter.call(el, value);
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    assigned.add(field); filled++;
    if (el.checkValidity && !el.checkValidity()) missing.push("Portal rejected an entered field");
  }
  if (missing.length) return { state: "blocked", detail: `${missing.length} unresolved field(s): ${[...new Set(missing)].join("; ")}. No calculation submitted.` };
  const calculate = actions.filter((el) => matches(el, ["Calculate", "Calculate premium", "Calculate quote"]));
  if (calculate.length === 1) {
    // Never calculate after filling just one field. Every supplied benefit setting must be mapped.
    const unmatched = fields.filter((f) => f.product && !assigned.has(f));
    if (unmatched.length || !filled) return { state: "blocked", detail: `${unmatched.length} quote setting(s) have no unique control. Review benefits/product choices before calculation.` };
    calculate[0].click();
    return { state: "calculated", next: "report", detail: "Calculation requested; waiting for the insurer result" };
  }
  // Part 2 p3 screenshot: this opens the cover workspace; it is not Finalize.
  if (brightrock && filled && click(["Finish - See the cover"])) return { state: "navigate", next: "capture", detail: "Opening BrightRock cover proposals from the approved policy details" };
  if (filled && click(["Save and Continue", "Save & Continue", "Continue", "Next"])) return { state: "navigate", next: "capture", detail: "Saving approved quote details" };
  if (momentum && click(["Benefits and Proposals"])) return { state: "navigate", next: "capture", detail: "Opening benefits and proposals" };
  return { state: "blocked", detail: "Quote page needs a verified control or broker input. No application accepted and no email sent." };
}
