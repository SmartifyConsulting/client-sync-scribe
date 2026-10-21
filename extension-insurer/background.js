// Drives one insurer login per tab. Credentials live only in memory for the job.
const jobs = new Map(); // portalTabId -> job
const discoveryHost = (host) => host === "discovery.co.za" || host.endsWith(".discovery.co.za");
function portalAllowed(url, job) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password) return false;
    return u.origin === job.origin || (job.discoveryRedirects && u.port === "" && discoveryHost(u.hostname));
  } catch { return false; }
}
const trustedApp = (url) => {
  try {
    const u = new URL(url);
    return ["https://holarc.co.za", "https://www.holarc.co.za", "https://holarc-wealth.lovable.app", "https://id-preview--320b9905-9d0e-4ca1-af45-821272397de6.lovable.app", "http://localhost:8080"].includes(u.origin);
  } catch { return false; }
};

function tell(job, msg) {
  chrome.tabs.sendMessage(job.appTabId, { insurer: job.insurer, workflowId: job.workflowId, ...msg }).catch(() => {});
}

chrome.runtime.onMessage.addListener((d, sender) => {
  const appTabId = sender.tab?.id;
  if (!appTabId || !trustedApp(sender.tab?.url)) return;
  if (d.type === "insurer-pdf-ack") {
    if (d.ok !== true || typeof d.captureId !== "string") return;
    // The app acknowledges only after the authenticated document save succeeds.
    chrome.storage.session.get(null).then(async (stored) => {
      const entry = Object.entries(stored).find(([key, j]) => key.startsWith("portal-") && j.appTabId === appTabId && j.workflowId === d.workflowId && j.pendingCaptures?.includes(d.captureId));
      if (!entry) return;
      const [key, job] = entry;
      job.pendingCaptures = job.pendingCaptures.filter((id) => id !== d.captureId);
      if (job.pendingCaptures.length) { await chrome.storage.session.set({ [key]: job }); return; }
      const tabId = Number(key.slice(7));
      // Remove routing first so intentional closure isn't reported as login failure.
      jobs.delete(tabId);
      await chrome.storage.session.remove(key);
      await chrome.tabs.remove(tabId).catch(() => {});
    }).catch(() => {});
    return;
  }
  if (d.type === "insurer-login") {
    if (!d.loginUrl || !d.username || !d.password) {
      chrome.tabs.sendMessage(appTabId, { type: "insurer-login-result", insurer: d.insurer, workflowId: d.workflowId, ok: false, message: "No saved login address or password." });
      return;
    }
    let origin;
    try { const u = new URL(d.loginUrl); if (u.protocol !== "https:" || u.username || u.password) throw new Error(); origin = u.origin; }
    catch { tell({ appTabId, ...d }, { type: "insurer-login-result", ok: false, message: "Set a valid HTTPS portal URL for this insurer." }); return; }
    const existing = [...jobs.entries()].find(([, j]) => j.appTabId === appTabId && j.insurer === d.insurer && j.workflowId === d.workflowId);
    if (existing) { chrome.tabs.remove(existing[0]).catch(() => {}); jobs.delete(existing[0]); }
    chrome.tabs.create({ url: d.loginUrl, active: false }, (tab) => {
      if (!tab?.id) return;
      const discoveryRedirects = /^discovery$/i.test(d.insurer) && discoveryHost(new URL(origin).hostname) && new URL(origin).port === "";
      const job = { ...d, appTabId, origin, discoveryRedirects, step: 0, done: false, submitted: false, expires: Date.now() + 15 * 60 * 1000 };
      jobs.set(tab.id, job);
      // Persist only routing metadata, never passwords/PINs.
      chrome.storage.session.set({ [`portal-${tab.id}`]: { appTabId, insurer: d.insurer, workflowId: d.workflowId, origin, expires: job.expires, pendingCaptures: [] } });
    });
    return;
  }
  const entry = [...jobs.entries()].find(([, j]) => j.insurer === d.insurer && j.workflowId === d.workflowId && j.appTabId === appTabId);
  if (!entry) return;
  const [tabId, job] = entry;
  if (d.type === "insurer-scan") { scanPortal(tabId, job); return; }
  if (d.type === "insurer-otp") {
    if (!/^\d{4,8}$/.test(d.otp)) return;
    chrome.scripting.executeScript({ target: { tabId }, func: fillOtp, args: [d.otp, job.origin, job.discoveryRedirects] }).then(() => {
      job.done = false;
      job.challenge = null;
      setTimeout(() => checkPortal(tabId), 1500);
    }).catch(() => tell(job, { type: "insurer-login-result", ok: false, message: "Finish verification in the insurer tab." }));
  }
  if (d.type === "insurer-email-check") { job.done = false; job.challenge = null; chrome.tabs.reload(tabId); }
});

chrome.tabs.onRemoved.addListener((id) => { const job = jobs.get(id); if (job) tell(job, { type: "insurer-login-result", ok: false, message: "Insurer portal tab closed." }); jobs.delete(id); chrome.storage.session.remove(`portal-${id}`); });

chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.status === "complete") checkPortal(tabId);
});

async function checkPortal(tabId) {
  const job = jobs.get(tabId);
  if (!job || job.done || job.checking) return;
  if (Date.now() >= job.expires) { job.username = ""; job.password = ""; job.done = true; tell(job, { type: "insurer-login-result", ok: false, message: "The 15-minute quote session expired. Unlock again." }); return; }
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!portalAllowed(tab?.url, job)) {
    job.done = true; job.username = ""; job.password = "";
    tell(job, { type: "insurer-login-result", ok: false, message: "The portal redirected to another login site. Finish there, or update the portal URL in Holarc Wealth." }); return;
  }
  // Downloads must match the actual current portal origin, even after a safe redirect.
  const key = `portal-${tabId}`;
  const stored = await chrome.storage.session.get(key);
  if (stored[key]) await chrome.storage.session.set({ [key]: { ...stored[key], origin: new URL(tab.url).origin } });
  job.checking = true;
  job.step += 1;
  if (job.step > 90) { job.done = true; job.checking = false; job.username = ""; job.password = ""; tell(job, { type: "insurer-login-result", ok: false, message: "The portal didn't finish logging in. Please finish in the insurer tab." }); return; }
  // Give single-page portals a moment to draw the form.
  await new Promise((r) => setTimeout(r, 1200));
  const [res] = await chrome.scripting.executeScript({ target: { tabId }, func: drive, args: [job.username, job.password, job.submitted, job.origin, job.discoveryRedirects] }).catch(() => [{}]);
  const r = res?.result || {};
  job.checking = false;
  if (r.state === "otp" || r.state === "email") {
    if (job.challenge !== r.state) tell(job, { type: "insurer-challenge", method: r.state, hint: r.hint });
    job.challenge = r.state;
  } else if (r.state === "submitted") { job.submitted = true; tell(job, { type: "insurer-login-progress", state: "connecting" }); }
  else if (r.state === "in") { job.done = true; job.username = ""; job.password = ""; tell(job, { type: "insurer-login-result", ok: true }); if (/^discovery$/i.test(job.insurer)) await scanPortal(tabId, job); }
  else if (r.state === "failed") { job.done = true; job.username = ""; job.password = ""; tell(job, { type: "insurer-login-result", ok: false, message: "The insurer rejected the login. Check it in the portal." }); }
  if (!job.done) setTimeout(() => checkPortal(tabId), 2500);
}

async function scanPortal(tabId, job) {
  if (!/^discovery$/i.test(job.insurer) || Date.now() >= job.expires) return tell(job, { type: "insurer-scan-result", ok: false, message: "Connect Discovery again to scan its current screen." });
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!portalAllowed(tab?.url, job)) throw new Error();
    const [result] = await chrome.scripting.executeScript({ target: { tabId }, func: scanQuoteScreen, args: [job.origin, job.discoveryRedirects] });
    if (!result?.result) throw new Error();
    tell(job, { type: "insurer-scan-result", ok: true, scan: result.result });
  } catch { tell(job, { type: "insurer-scan-result", ok: false, message: "Could not read the current Discovery screen. Reconnect and try again." }); }
}

// Read structural quote metadata only: never values, page text, URLs, IDs or screenshots.
function scanQuoteScreen(origin, discoveryRedirects) {
  const u = new URL(location.href);
  if (u.protocol !== "https:" || u.username || u.password || !(u.origin === origin || (discoveryRedirects && !u.port && (u.hostname === "discovery.co.za" || u.hostname.endsWith(".discovery.co.za"))))) throw new Error("Untrusted portal");
  const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  const inputs = [...document.querySelectorAll("input, select, textarea")].filter(visible);
  const sensitive = /password|passcode|otp|pin|token|verification|one.?time|username|user.?name|login|email|phone|identity|id.?number|passport|account/i;
  if (inputs.some((el) => el.type === "password" || el.autocomplete === "one-time-code")) return { state: "verification", fields: [], blocked: 0, frames: 0, truncated: false };
  const safe = (s) => {
    const t = String(s || "").replace(/\s+/g, " ").trim();
    return t.length <= 90 && !/@|\d{4,}|https?:|[<>]/i.test(t) ? t : "";
  };
  const allowedOption = /^(?:level|compulsory|age[- ]rated|standard|classic|essential|comprehensive|core|included|excluded|yes|no|male|female|own occupation|suited occupation|any occupation|cpi(?: \+ \d+%)?|\d+%?(?: fixed)?|(?:to age )?\d+|\d+ (?:days|months?|years?)|no increase|cover increase: (?:fixed percentage|cpi rate)|guarantee term extender)$/i;
  let blocked = 0;
  const fields = inputs.flatMap((el) => {
    if (["hidden", "submit", "button", "file"].includes(el.type)) return [];
    const label = safe(el.labels?.[0]?.textContent || el.getAttribute("aria-label"));
    if (sensitive.test(`${el.type} ${el.name} ${el.id} ${el.autocomplete} ${label}`)) { blocked++; return []; }
    const quoteField = /cover|benefit|premium|growth|escalation|increase|waiting|term|occupation|smok|gender|sex|birth|age|income|disabil|illness|vitality|plan|accelerat|payout/i.test(label);
    if (!label || !quoteField) { blocked++; return []; }
    return [{ label, kind: el.tagName === "SELECT" ? "select" : ["checkbox", "radio"].includes(el.type) ? el.type : "input", required: el.required || el.getAttribute("aria-required") === "true", disabled: el.disabled,
      options: el.tagName === "SELECT" ? [...el.options].map((o) => safe(o.textContent)).filter((t) => t && allowedOption.test(t)).slice(0, 40) : [] }];
  });
  return { state: fields.length ? "fields" : "no-fields", fields: fields.slice(0, 100), blocked, frames: document.querySelectorAll("iframe").length, truncated: fields.length > 100 };
}

// Capture only PDF downloads from a uniquely associated, broker-opened portal.
// No reading unrelated browsing/downloads, no forwarding session cookies.
chrome.downloads.onCreated.addListener(async (item) => {
  if (!/\.pdf(?:[?#]|$)/i.test(item.filename || item.url) && item.mime !== "application/pdf") return;
  const stored = await chrome.storage.session.get(null);
  const entries = Object.entries(stored).filter(([key, j]) => key.startsWith("portal-") && Date.now() < j.expires);
  const matches = entries.filter(([, j]) => {
    try { return new URL(item.referrer || item.url).origin === j.origin && new URL(item.url).origin === j.origin; } catch { return false; }
  });
  if (matches.length !== 1) return;
  const [key, job] = matches[0];
  const tabId = Number(key.slice(7));
  const app = await chrome.tabs.get(job.appTabId).catch(() => null);
  if (!trustedApp(app?.url)) return;
  try {
    const [result] = await chrome.scripting.executeScript({ target: { tabId }, func: readPdf, args: [item.url] });
    if (!result?.result?.base64) throw new Error();
    const captureId = `${tabId}-${item.id}`;
    const latest = (await chrome.storage.session.get(key))[key];
    if (!latest || Date.now() >= latest.expires) return;
    await chrome.storage.session.set({ [key]: { ...latest, pendingCaptures: [...(latest.pendingCaptures || []), captureId] } });
    tell(job, { type: "insurer-pdf", captureId, filename: (item.filename || "quote.pdf").split(/[\\/]/).pop(), base64: result.result.base64 });
  } catch { tell(job, { type: "insurer-pdf-error" }); }
});

async function readPdf(url) {
  if (new URL(url).origin !== location.origin) throw new Error("Unsupported PDF source");
  const response = await fetch(url, { credentials: "include", redirect: "error" });
  if (!response.ok || Number(response.headers.get("content-length")) > 5242880) throw new Error("PDF unavailable");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > 5242880 || new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("Invalid PDF");
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return { base64: btoa(text) };
}

// ---- injected into the insurer page ----
function drive(username, password, submitted, origin, discoveryRedirects) {
  // Recheck inside the page: navigation may occur between tab inspection and injection.
  const u = new URL(location.href);
  if (u.protocol !== "https:" || u.username || u.password || !(u.origin === origin || (discoveryRedirects && !u.port && (u.hostname === "discovery.co.za" || u.hostname.endsWith(".discovery.co.za"))))) return { state: "waiting" };
  const vis = (el) => el && el.offsetParent !== null && !el.disabled;
  const setVal = (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    el.focus(); setter.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.blur();
  };
  const submit = (from) => {
    const form = from.closest("form");
    const btn = (form || document).querySelector('button[type=submit], input[type=submit]') ||
      [...document.querySelectorAll("button, a[role=button], input[type=button]")].find((b) => vis(b) && /log ?in|sign ?in|next|continue|submit|verify/i.test(b.value || b.textContent || ""));
    if (btn) btn.click(); else if (form) form.requestSubmit ? form.requestSubmit() : form.submit();
  };
  const inputs = [...document.querySelectorAll("input")].filter(vis);
  const text = document.body.innerText || "";
  if (/incorrect password|invalid (credentials|password|username)|login failed/i.test(text)) return { state: "failed" };
  const otp = inputs.find((i) => i.autocomplete === "one-time-code" || /otp|pin|token|code|verification/i.test(`${i.name} ${i.id} ${i.placeholder} ${i.getAttribute("aria-label") || ""}`));
  if (otp && !inputs.some((i) => i.type === "password")) {
    const m = text.match(/sent to ([^\n.]{3,40})/i);
    return { state: "otp", hint: m ? m[1].trim() : "" };
  }
  if (/check your (e-?mail|inbox)|verification (e-?mail|link)|we('ve| have) sent (you )?an? e-?mail/i.test(text)) {
    const m = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+|[\w*]+@[\w*.-]+/);
    return { state: "email", hint: m ? m[0] : "" };
  }
  const pw = inputs.find((i) => i.type === "password");
  const user = inputs.find((i) => ["text", "email", "tel"].includes(i.type) && /user|email|login|id|name/i.test(`${i.name} ${i.id} ${i.placeholder} ${i.autocomplete}`)) ||
    inputs.find((i) => ["text", "email"].includes(i.type));
  if (pw && !submitted) {
    if (user && !user.value) setVal(user, username);
    setVal(pw, password);
    submit(pw);
    return { state: "submitted" };
  }
  if (user && !user.value && /log ?in|sign ?in|username/i.test(text)) { setVal(user, username); submit(user); return { state: "submitted" }; }
  if (!pw && /log ?out|sign ?out/i.test(text) && /quote|quotation|new business|adviser dashboard/i.test(text)) return { state: "in" };
  return { state: "waiting" };
}

function fillOtp(code, origin, discoveryRedirects) {
  const u = new URL(location.href);
  if (u.protocol !== "https:" || u.username || u.password || !(u.origin === origin || (discoveryRedirects && !u.port && (u.hostname === "discovery.co.za" || u.hostname.endsWith(".discovery.co.za"))))) return;
  const vis = (el) => el && el.offsetParent !== null && !el.disabled;
  const inputs = [...document.querySelectorAll("input")].filter(vis).filter((i) => i.type !== "hidden" && i.type !== "checkbox");
  if (!inputs.length) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  const put = (el, v) => { el.focus(); setter.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
  const boxes = inputs.filter((i) => i.maxLength === 1);
  if (boxes.length >= code.length) code.split("").forEach((c, i) => put(boxes[i], c));
  else put(inputs.find((i) => i.autocomplete === "one-time-code" || /otp|pin|token|code/i.test(`${i.name} ${i.id} ${i.placeholder}`)) || inputs[0], code);
  const btn = [...document.querySelectorAll("button, input[type=submit]")].find((b) => vis(b) && /verify|continue|submit|next|confirm|log ?in/i.test(b.value || b.textContent || ""));
  if (btn) btn.click();
}
