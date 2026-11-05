// Drives one insurer login per tab. Credentials live only in memory for the job.
importScripts("portalJourney.js", "oldMutualJourney.js", "interfaceMonitor.js");
const jobs = new Map(); // portalTabId -> job
const pendingLogins = new Map();
const RECOVERY_ALARM = "holarc-session-recovery";
// Session storage contains routing only. A renewed password is fetched by Holarc
// under its existing, still-valid Password Protector token and discarded on login.
function routeFor(job, previous = {}) {
  return { ...previous, appTabId: job.appTabId, insurer: job.insurer, integrationId: job.integrationId,
    workflowId: job.workflowId, ownerId: job.ownerId, connectionAttemptId: job.connectionAttemptId, origin: previous.origin || job.origin,
    discoveryRedirects: job.discoveryRedirects, expires: job.expires, pendingCaptures: previous.pendingCaptures || [],
    connected: !!job.connected, recoverySpent: !!job.recoverySpent, recoveryId: job.recoveryId,
    autoReconnect: job.autoReconnect === true };
}
async function saveRoute(tabId, job) {
  if (job.cancelled || jobs.get(tabId) !== job) return;
  const key = `portal-${tabId}`, stored = await chrome.storage.session.get(key);
  if (!job.cancelled && jobs.get(tabId) === job) await chrome.storage.session.set({ [key]: routeFor(job, stored[key]) });
}
async function inspectSession(tabId, job) {
  if (!job.connected || !job.autoReconnect || job.cancelled || job.recoveryChecking) return;
  job.recoveryChecking = true;
  try {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    const app = await chrome.tabs.get(job.appTabId).catch(() => null);
    if (!portalAllowed(tab?.url, job) || !trustedApp(app?.url)) return;
    const [probe] = await chrome.scripting.executeScript({ target: { tabId }, func: drive,
      args: ["", "", true, job.origin, job.discoveryRedirects, true, true] }).catch(() => []);
    if (job.cancelled || jobs.get(tabId) !== job) return;
    const state = probe?.result?.state;
    if (["otp", "email"].includes(state)) {
      if (job.challenge !== state) tell(job, { type: "insurer-challenge", method: state, hint: probe.result.hint });
      job.challenge = state;
      return;
    }
    if (state === "captcha" || state === "blocked") {
      job.autoReconnect = false;
      await saveRoute(tabId, job);
      tell(job, { type: "insurer-login-result", ok: false, message: state === "captcha" ? "Complete the CAPTCHA in the insurer tab, then reconnect." : "An unexpected portal message is blocking this connection. Automation has paused for review." });
      return;
    }
    if (state !== "login") return;
    if (job.recoverySpent && !job.recoveryId) return;
    if (!job.recoveryId) {
      job.recoverySpent = true;
      job.recoveryId = crypto.randomUUID();
      await saveRoute(tabId, job);
    }
    if (!job.cancelled && jobs.get(tabId) === job) tell(job, { type: "insurer-session-expired", ownerId: job.ownerId, integrationId: job.integrationId, recoveryId: job.recoveryId });
  } finally { job.recoveryChecking = false; }
}
if (chrome.alarms) {
  chrome.alarms.create(RECOVERY_ALARM, { periodInMinutes: 1 });
  chrome.alarms.onAlarm.addListener(async alarm => {
    if (alarm.name !== RECOVERY_ALARM) return;
    const stored = await chrome.storage.session.get(null);
    for (const [key, route] of Object.entries(stored)) {
      if (!key.startsWith("portal-") || route.cancelled || !route.connected || !route.autoReconnect) continue;
      const tabId = Number(key.slice(7));
      if (!jobs.has(tabId)) jobs.set(tabId, { ...route, done: true, username: "", password: "" });
      await inspectSession(tabId, jobs.get(tabId));
    }
  });
}
// Trusted redirect scope = the saved portal's own registrable domain (e.g. momentum.co.za), so SSO hops stay inside that insurer.
const baseDomain = (host) => { const p = host.split("."); const n = /\.(co|org|gov|ac|net)\.za$/.test(host) ? 3 : 2; return p.length >= n ? p.slice(-n).join(".") : null; };
const domainHost = (host, base) => !!base && (host === base || host.endsWith("." + base));
function portalAllowed(url, job) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password) return false;
    return u.origin === job.origin || (u.port === "" && domainHost(u.hostname, job.discoveryRedirects));
  } catch { return false; }
}
const trustedApp = (url) => {
  try {
    const u = new URL(url);
    return ["https://holarc.co.za", "https://www.holarc.co.za", "https://holarc-wealth.lovable.app", "https://id-preview--320b9905-9d0e-4ca1-af45-821272397de6.lovable.app", "http://localhost:8080"].includes(u.origin);
  } catch { return false; }
};
const interfaceMonitor = typeof installInterfaceMonitor === "function" ? installInterfaceMonitor(trustedApp) : null;

function tell(job, msg) {
  if (msg.state === "connecting" && !msg.phase) msg = { ...msg, phase: "waiting" };
  chrome.tabs.sendMessage(job.appTabId, { insurer: job.insurer, workflowId: job.workflowId, connectionAttemptId: job.connectionAttemptId, ...msg }).catch(() => {});
}

chrome.runtime.onMessage.addListener((d, sender) => {
  const appTabId = sender.tab?.id;
  if (!appTabId || !trustedApp(sender.tab?.url)) return;
  if (d.type === "insurer-session-status") {
    void (async () => {
      let state = "missing", connectionAttemptId;
      const stored = await chrome.storage.session.get(null);
      for (const [key, route] of Object.entries(stored)) {
        if (!key.startsWith("portal-") || route.cancelled || route.appTabId !== appTabId ||
            !d.ownerId || route.ownerId !== d.ownerId || route.workflowId !== d.workflowId ||
            route.insurer !== d.insurer || route.integrationId !== d.integrationId) continue;
        const tabId = Number(key.slice(7));
        const tab = await chrome.tabs.get(tabId).catch(() => null);
        if (!portalAllowed(tab?.url, route)) continue;
        if (route.expires && Date.now() >= route.expires) { state = "expired"; break; }
        const [probe] = await chrome.scripting.executeScript({ target: { tabId }, func: drive,
          args: ["", "", true, route.origin, route.discoveryRedirects, true, true] }).catch(() => []);
        const latest = (await chrome.storage.session.get(key))[key];
        if (!latest || latest.cancelled) continue;
        connectionAttemptId = route.connectionAttemptId;
        state = probe?.result?.state === "in" ? "connected" : probe?.result?.state === "login" ? "expired" : "unknown";
        if (state === "connected" && !jobs.has(tabId)) jobs.set(tabId, { ...latest, connected: true, done: true, username: "", password: "" });
        break;
      }
      chrome.tabs.sendMessage(appTabId, { type: "insurer-session-status-result", insurer: d.insurer,
        workflowId: d.workflowId, ownerId: d.ownerId, requestId: d.requestId, state, connectionAttemptId }).catch(() => {});
    })();
    return;
  }
  if (d.type === "insurer-reconnect-credentials") {
    const entry = [...jobs.entries()].find(([, j]) => j.appTabId === appTabId && j.insurer === d.insurer &&
      j.workflowId === d.workflowId && j.connectionAttemptId === d.connectionAttemptId && j.recoveryId === d.recoveryId);
    if (!entry) return;
    const [tabId, job] = entry;
    if (job.cancelled || !job.autoReconnect) return;
    if (!d.username || !d.password) {
      tell(job, { type: "insurer-login-progress", state: "challenge", phase: "unlock-required" });
      return;
    }
    job.recoveryId = null; // consume once, including duplicate/in-flight replies
    job.reconnecting = true; job.done = false; job.checking = false;
    job.submitted = false; job.passwordSubmitted = false; job.challenge = null; job.step = 0;
    job.username = d.username; job.password = d.password; job.expires = Date.now() + 15 * 60 * 1000;
    tell(job, { type: "insurer-login-progress", state: "connecting", phase: "reconnecting" });
    void saveRoute(tabId, job).then(() => checkPortal(tabId));
    return;
  }
  if (d.type === "insurer-stop") {
    for (const [key, pending] of pendingLogins) if (pending.appTabId === appTabId && pending.insurer === d.insurer && pending.workflowId === d.workflowId && (!d.connectionAttemptId || pending.connectionAttemptId === d.connectionAttemptId)) {
      pending.cancelled = true; pendingLogins.delete(key);
    }
    for (const [id, job] of jobs) {
      if (job.appTabId !== appTabId || job.insurer !== d.insurer || job.workflowId !== d.workflowId ||
          (d.connectionAttemptId && job.connectionAttemptId !== d.connectionAttemptId)) continue;
      job.cancelled = true; job.done = true; job.username = ""; job.password = "";
      jobs.delete(id);
      void chrome.storage.session.get(`portal-${id}`).then(async stored => {
        const route = stored[`portal-${id}`];
        if (route?.pendingCaptures?.length) await chrome.storage.session.set({ [`portal-${id}`]: { ...route, cancelled: true, batchOpen: false } });
        else await chrome.storage.session.remove(`portal-${id}`);
      });
    }
    tell({ appTabId, ...d }, { type: "insurer-stopped" });
    return;
  }
  if (d.type === "insurer-pdf-ack") {
    if (d.ok !== true || typeof d.captureId !== "string") return;
    // The app acknowledges only after the authenticated document save succeeds.
    chrome.storage.session.get(null).then(async (stored) => {
      const entry = Object.entries(stored).find(([key, j]) => key.startsWith("portal-") && j.appTabId === appTabId && j.workflowId === d.workflowId && j.pendingCaptures?.includes(d.captureId));
      if (!entry) return;
      const [key, job] = entry;
      job.pendingCaptures = job.pendingCaptures.filter((id) => id !== d.captureId);
      const live = jobs.get(Number(key.slice(7)));
      if (job.cancelled) {
        if (job.pendingCaptures.length) await chrome.storage.session.set({ [key]: job });
        else await chrome.storage.session.remove(key);
        return;
      }
      if (live?.currentCaptureId === d.captureId) live.pdfSaved = true;
      if (job.pendingCaptures.length || live?.running || job.batchOpen) { await chrome.storage.session.set({ [key]: job }); return; }
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
    // Bidvest's public home page has no login form. Its Financial Advisers
    // menu links to this observed adviser entry; start there without granting
    // access to the public website or sending credentials to its contact form.
    try {
      const entry = new URL(d.loginUrl);
      if (/^Bidvest Life(?: \/ FMI)?$/i.test(d.insurer) && entry.protocol === "https:" && !entry.port && !entry.username && !entry.password &&
          ["www.bidvestlife.co.za", "bidvestlife.co.za"].includes(entry.hostname) && entry.pathname === "/" && !entry.search && !entry.hash) {
        d.loginUrl = "https://adviser.fmi.co.za/";
      }
    } catch { /* The normal URL validation below reports invalid entries. */ }
    let origin;
    try { const u = new URL(d.loginUrl); if (u.protocol !== "https:" || u.username || u.password) throw new Error(); origin = u.origin; }
    catch { tell({ appTabId, ...d }, { type: "insurer-login-result", ok: false, message: "Set a valid HTTPS portal URL for this insurer." }); return; }
    const existing = [...jobs.entries()].find(([, j]) => j.appTabId === appTabId && j.insurer === d.insurer && j.workflowId === d.workflowId);
    if (existing) { chrome.tabs.remove(existing[0]).catch(() => {}); jobs.delete(existing[0]); }
    // Creating then minimising a native window can flash on Windows. Keep the
    // broker's current tab in place and create an inactive portal tab instead.
    const pendingKey=JSON.stringify([appTabId,d.insurer,d.workflowId]);
    const pending={appTabId,insurer:d.insurer,workflowId:d.workflowId,connectionAttemptId:d.connectionAttemptId,cancelled:false};
    pendingLogins.set(pendingKey,pending);
    chrome.tabs.create({ url: d.loginUrl, active: false, ...(sender.tab.windowId ? { windowId: sender.tab.windowId } : {}) }, (tab) => {
      if(pending.cancelled||pendingLogins.get(pendingKey)!==pending){d.username="";d.password="";return;}
      pendingLogins.delete(pendingKey);
      if (!tab?.id) return;
      const discoveryRedirects = new URL(origin).port === "" ? (baseDomain(new URL(origin).hostname) || false) : false;
      const job = { ...d, appTabId, appWindowId: sender.tab.windowId, origin, discoveryRedirects, step: 0, done: false, submitted: false, expires: Date.now() + 15 * 60 * 1000 };
      jobs.set(tab.id, job);
      tell(job, { type: "insurer-login-progress", state: "connecting", phase: "opening" });
      // Persist only routing metadata, never passwords/PINs.
      chrome.storage.session.set({ [`portal-${tab.id}`]: routeFor(job) });
    });
    return;
  }
  const entry = [...jobs.entries()].find(([, j]) => j.insurer === d.insurer && j.workflowId === d.workflowId && j.appTabId === appTabId);
  if (!entry) return;
  const [tabId, job] = entry;
  if (d.type === "insurer-scan") { scanPortal(tabId, job); return; }
  if (d.type === "insurer-quote-submit") { runScenarios(tabId, job, d.scenarios); return; }
  if (d.type === "insurer-otp") {
    if (!/^\d{4,8}$/.test(d.otp)) return;
    chrome.scripting.executeScript({ target: { tabId }, func: fillOtp, args: [d.otp, job.origin, job.discoveryRedirects] }).then(() => {
      if (job.cancelled) return;
      job.done = false;
      job.challenge = null;
      setTimeout(() => checkPortal(tabId), 1500);
    }).catch(() => tell(job, { type: "insurer-login-result", ok: false, message: "Finish verification in the insurer tab." }));
  }
  if (d.type === "insurer-email-check") { job.done = false; job.challenge = null; chrome.tabs.reload(tabId); }
});

chrome.tabs.onRemoved.addListener((id) => { const job = jobs.get(id); if (job) tell(job, { type: "insurer-login-result", ok: false, message: "Insurer portal tab closed." }); jobs.delete(id); chrome.storage.session.remove(`portal-${id}`); });

// Follow only a popup opened by this managed portal and already on its trusted origin.
async function trackPortalTab(tab) {
  const job = jobs.get(tab.openerTabId);
  if (!job || (!job.running && !(job.connected && job.autoReconnect)) || !portalAllowed(tab.url || tab.pendingUrl, job)) return;
  if (!job.running) {
    const child = { ...job, origin: new URL(tab.url || tab.pendingUrl).origin, username: "", password: "", done: true, checking: false, recoveryChecking: false, recoveryId: null, recoverySpent: false };
    jobs.set(tab.id, child);
    await saveRoute(tab.id, child);
    return; // Follow broker-opened adviser tabs without moving focus or navigating.
  }
  const parent = job.portalTabId || tab.openerTabId;
  job.portalTabId = tab.id;
  jobs.set(tab.id, job);
  const oldKey = `portal-${parent}`;
  const route = (await chrome.storage.session.get(oldKey))[oldKey];
  if (job.cancelled) return;
  if (route) {
    await chrome.storage.session.set({ [`portal-${tab.id}`]: { ...route, origin: new URL(tab.url || tab.pendingUrl).origin } });
    await chrome.storage.session.remove(oldKey);
  }
  await chrome.tabs.update(tab.id, { active: false }).catch(() => {});
  // Never minimise the broker's browser when a provider opens a quote tab.
  if (tab.active && tab.windowId === job.appWindowId) await chrome.tabs.update(job.appTabId, { active: true }).catch(() => {});
}
chrome.tabs.onCreated.addListener(trackPortalTab);

chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.status === "complete") {
    // target=_blank tabs may be reported as about:blank before their trusted
    // destination appears. Only an existing managed opener can adopt them.
    if (!jobs.has(tabId)) {
      const tab = await chrome.tabs.get(tabId).catch(() => null);
      if (tab) await trackPortalTab(tab);
    }
    checkPortal(tabId);
  }
  else if (info.status === "loading") { const job = jobs.get(tabId); if (job && !job.done) tell(job, { type: "insurer-login-progress", state: job.challenge ? "challenge" : "connecting", phase: job.challenge ? job.challenge : job.submitted ? "waiting" : "loading" }); }
});

async function checkPortal(tabId) {
  const job = jobs.get(tabId);
  if (!job || job.checking) return;
  if (job.done) { await inspectSession(tabId, job); return; }
  if (Date.now() >= job.expires) { job.autoReconnect = false; job.username = ""; job.password = ""; job.done = true; await saveRoute(tabId, job); tell(job, { type: "insurer-login-result", ok: false, message: "The 15-minute quote session expired. Unlock again." }); return; }
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!portalAllowed(tab?.url, job)) {
    job.done = true; job.autoReconnect = false; job.username = ""; job.password = ""; await saveRoute(tabId, job);
    tell(job, { type: "insurer-login-result", ok: false, message: "The portal redirected to another login site. Finish there, or update the portal URL in Holarc Wealth." }); return;
  }
  // Downloads must match the actual current portal origin, even after a safe redirect.
  await interfaceMonitor?.remember(job.insurer, new URL(tab.url).origin).catch(() => {});
  const key = `portal-${tabId}`;
  const stored = await chrome.storage.session.get(key);
  if (stored[key]) await chrome.storage.session.set({ [key]: { ...stored[key], origin: new URL(tab.url).origin } });
  job.checking = true;
  job.step += 1;
  if (job.step > 90) { job.done = true; job.autoReconnect = false; job.checking = false; job.username = ""; job.password = ""; await saveRoute(tabId, job); tell(job, { type: "insurer-login-result", ok: false, message: "The portal didn't finish logging in. Please finish in the insurer tab." }); return; }
  // Give single-page portals a moment to draw the form.
  await new Promise((r) => setTimeout(r, 1200));
  if (job.cancelled || jobs.get(tabId) !== job) { job.checking = false; return; }
  const [res] = await chrome.scripting.executeScript({ target: { tabId }, func: drive, args: [job.username, job.password, job.submitted, job.origin, job.discoveryRedirects, job.passwordSubmitted === true] }).catch(() => [{}]);
  const r = res?.result || {};
  if (job.cancelled || jobs.get(tabId) !== job) { job.checking = false; return; }
  job.checking = false;
  if (r.state === "otp" || r.state === "email") {
    if (job.challenge !== r.state) tell(job, { type: "insurer-challenge", method: r.state, hint: r.hint });
    job.challenge = r.state;
  } else if (r.state === "submitted") { job.submitted = true; if (r.credentialStep === "password") job.passwordSubmitted = true; tell(job, { type: "insurer-login-progress", state: "connecting", phase: "credentials" }); }
  else if (r.state === "waiting") tell(job, { type: "insurer-login-progress", state: "connecting", phase: job.submitted ? "waiting" : "loading" });
  else if (r.state === "in") {
    job.done = true; job.connected = true; job.recoverySpent = false; job.recoveryId = null;
    job.username = ""; job.password = ""; await saveRoute(tabId, job);
    if (job.reconnecting) tell(job, { type: "insurer-login-progress", state: "connected", phase: "reconnected" });
    tell(job, { type: "insurer-login-result", ok: true }); job.reconnecting = false;
    if (/^discovery$/i.test(job.insurer)) await scanPortal(tabId, job);
  }
  else if (r.state === "failed") { job.autoReconnect = false; job.done = true; job.username = ""; job.password = ""; await saveRoute(tabId, job); tell(job, { type: "insurer-login-result", ok: false, message: r.reason === "locked" ? "The provider has locked your profile. Unlock it in the provider portal before trying again. No further login attempts will be made in this session." : "Login failed. The provider rejected the login. Please recheck your username and password and try again." }); }
  else if (r.state === "blocked" || r.state === "captcha") {
    job.autoReconnect = false; job.done = true; job.username = ""; job.password = ""; await saveRoute(tabId, job);
    void interfaceMonitor?.scan("unexpected-dialog", tabId).catch(() => {});
    tell(job, { type: "insurer-login-result", ok: false, message: r.state === "captcha" ? "Complete the CAPTCHA in the insurer tab, then reconnect." : "An unexpected portal message is blocking this connection. Automation has paused for review. No further login was submitted." });
  }
  if (r.state === "waiting" && !job.submitted && job.step === 5) void interfaceMonitor?.scan("login-stalled", tabId).catch(() => {});
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
  if (u.protocol !== "https:" || u.username || u.password || !(u.origin === origin || (typeof discoveryRedirects === "string" && !u.port && (u.hostname === discoveryRedirects || u.hostname.endsWith("." + discoveryRedirects))))) throw new Error("Untrusted portal");
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
    if (j.cancelled) return false;
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
    if (!latest || latest.cancelled || Date.now() >= latest.expires) return;
    await chrome.storage.session.set({ [key]: { ...latest, pendingCaptures: [...(latest.pendingCaptures || []), captureId] } });
    const live = jobs.get(tabId);
    if (live) { live.pdfSeen = true; live.currentCaptureId = captureId; }
    tell(job, { type: "insurer-login-progress", state: "connected", phase: "capturing" });
    tell(job, { type: "insurer-pdf", captureId, n: live?.currentScenario, filename: (item.filename || "quote.pdf").split(/[\\/]/).pop(), base64: result.result.base64 });
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
function drive(username, password, submitted, origin, discoveryRedirects, passwordSubmitted = false, probeOnly = false) {
  // Recheck inside the page: navigation may occur between tab inspection and injection.
  const u = new URL(location.href);
  if (u.protocol !== "https:" || u.username || u.password || !(u.origin === origin || (typeof discoveryRedirects === "string" && !u.port && (u.hostname === discoveryRedirects || u.hostname.endsWith("." + discoveryRedirects))))) return { state: "waiting" };
  // Old Mutual's Material inputs/buttons live in nested open shadow roots.
  // These roots are part of the same already-verified portal, not new origins.
  const query = (root, selector) => {
    const found = [...root.querySelectorAll(selector)];
    for (const el of root.querySelectorAll("*")) if (el.shadowRoot) found.push(...query(el.shadowRoot, selector));
    return found;
  };
  const vis = (el) => el && !el.disabled && (el.getClientRects ? el.getClientRects().length > 0 : el.offsetParent !== null);
  const buttonText = (el) => (el.value || el.textContent?.trim() || el.getAttribute("aria-label") || el.getRootNode?.().host?.textContent || "").trim();
  const setVal = (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    el.focus(); setter.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    el.blur();
  };
  const submit = (from) => {
    let form = from.closest("form"), host = from.getRootNode?.().host;
    while (!form && host) { form = host.closest("form"); host = host.getRootNode?.().host; }
    const scope = form || document;
    // Observed Momentum login uses an anchor without href or role=button.
    // Match only its exact login control on the verified account host.
    const momentumLogin = u.hostname === "adviser-account.momentum.co.za" ? ", a#btn-login" : "";
    const buttons = query(scope, "button, a[role=button], input[type=button], input[type=submit]" + momentumLogin).filter(vis);
    const named = buttons.filter(b => /^(log ?in|sign ?in|next|continue|submit|verify)$/i.test(buttonText(b)));
    const explicit = buttons.filter(b => b.type === "submit");
    const btn = named.length === 1 ? named[0] : named.length === 0 && explicit.length === 1 ? explicit[0] : null;
    if (btn) { btn.click(); return true; }
    // Ambiguous or unrecognised actions need a user, not a fabricated submit.
    return false;
  };
  const inputs = query(document, "input").filter(i => i.type !== "hidden" && vis(i));
  const text = document.body.innerText || "";
  // AdviserConnect's signed-in home has no visible logout link. Recognise its
  // dashboard before treating the client-search box as a login/OTP field.
  const momentumHome = u.hostname === "adviserconnect.momentum.co.za" && u.pathname === "/" &&
    document.title === "Home | AdviserConnect" &&
    /Welcome to AdviserConnect/i.test(text) && /Quotes & calculators/i.test(text) &&
    inputs.some(i => i.getAttribute("aria-label") === "Client search" ||
      [...(i.labels || [])].some(label => label.textContent.trim() === "Client search")) &&
    !inputs.some(i => i.type === "password");
  if (momentumHome) return { state: "in" };
  if (/your (?:profile|account) has been locked/i.test(text)) return { state: "failed", reason: "locked" };
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
  // Observed authenticated Bidvest adviser dashboard keeps sign-out in a menu.
  if (u.hostname === "adviser.fmi.co.za" && !pw &&
      ["Clients", "Documents", "Commission"].every(label => query(document, "button").some(b => vis(b) && buttonText(b).replace(/arrow_drop_down/g, "").trim() === label)) &&
      query(document, "a").some(a => vis(a) && buttonText(a) === "Quotes" && /^https:\/\/secure\.fmi\.co\.za\/quotes\//.test(a.getAttribute("href") || ""))) return { state: "in" };
  if (query(document, 'iframe[src*="recaptcha"], iframe[src*="hcaptcha"], .g-recaptcha, .h-captcha, [id*="captcha-challenge"]').some(vis)) return { state: "captcha" };
  if (query(document, 'dialog[open], [role="dialog"], [role="alertdialog"]').some(vis)) return { state: "blocked" };
  // The observed MyOldMutual home hides Logout inside its account menu.
  // Recognise its authenticated navigation without opening that menu, reading
  // account values, or treating a failed portfolio-data load as a login failure.
  const oldMutualHome = u.hostname === "my.oldmutual.co.za" && /^\/app\/secure(?:\/|$)/.test(u.pathname) &&
    document.title === "MyOldMutual" && !pw &&
    query(document, "a").some(a => vis(a) && /^https:\/\/secure\.oldmutual\.co\.za\/?$/.test(a.getAttribute("href") || "")) &&
    query(document, "nav").some(nav => {
      if (!vis(nav)) return false;
      const labels = query(nav, "p, a, button").filter(vis).map(el => buttonText(el));
      return labels.includes("Home") && labels.includes("Manage");
    });
  if (oldMutualHome) return { state: "in" };
  const user = inputs.find((i) => ["text", "email", "tel"].includes(i.type) && /user|email|login|id|name/i.test(`${i.name} ${i.id} ${i.placeholder} ${i.autocomplete}`)) ||
    inputs.find((i) => ["text", "email"].includes(i.type));
  if (!pw && /log ?out|sign ?out/i.test(text) && /quote|quotation|new business|adviser dashboard/i.test(text)) return { state: "in" };
  if (!pw && domainHostForPage(u.hostname, "oldmutual.co.za") && query(document, "button").some(b => vis(b) && /^Logged In as\b/i.test(buttonText(b)))) return { state: "in" };
  if (probeOnly) {
    const actions = query(document, "button, a[role=button], input[type=submit]" + (u.hostname === "adviser-account.momentum.co.za" ? ", a#btn-login" : "")).filter(vis);
    const loginActions = actions.filter(b => /^(log ?in|sign ?in)$/i.test(buttonText(b)));
    const emailFirst = u.hostname === "login.fmi.co.za" && user?.type === "email" && user.name === "email" && /Adviser Portal/i.test(text);
    return { state: (pw && inputs.filter(i => i.type === "password").length === 1 && loginActions.length === 1) || emailFirst ? "login" : "waiting" };
  }
  if (pw && !passwordSubmitted && username && password) {
    if (user && user.value !== username) setVal(user, username);
    setVal(pw, password);
    return submit(pw) ? { state: "submitted", credentialStep: "password" } : { state: "waiting" };
  }
  // Bidvest's observed first screen says Adviser Portal, not Login, and can
  // contain a browser-autofilled email. Advance it once using the test's login.
  if (!pw && !submitted && u.hostname === "login.fmi.co.za" &&
      user?.type === "email" && user.name === "email" && /Adviser Portal/i.test(text)) {
    if (user.value !== username) setVal(user, username);
    return { state: submit(user) ? "submitted" : "waiting" };
  }
  if (!pw && !submitted && user && !user.value && /log ?in|sign ?in|username/i.test(text)) { setVal(user, username); return { state: submit(user) ? "submitted" : "waiting" }; }
  if (!pw && /log ?out|sign ?out/i.test(text) && /quote|quotation|new business|adviser dashboard/i.test(text)) return { state: "in" };
  if (!pw && domainHostForPage(u.hostname, "oldmutual.co.za") && query(document, "button").some(b => vis(b) && /^Logged In as\b/i.test(buttonText(b)))) return { state: "in" };
  return { state: "waiting" };
  function domainHostForPage(host, base) { return host === base || host.endsWith("." + base); }
}

function fillOtp(code, origin, discoveryRedirects) {
  const u = new URL(location.href);
  if (u.protocol !== "https:" || u.username || u.password || !(u.origin === origin || (typeof discoveryRedirects === "string" && !u.port && (u.hostname === discoveryRedirects || u.hostname.endsWith("." + discoveryRedirects))))) return;
  const query = (root, selector) => {
    const found = [...root.querySelectorAll(selector)];
    for (const el of root.querySelectorAll("*")) if (el.shadowRoot) found.push(...query(el.shadowRoot, selector));
    return found;
  };
  const vis = (el) => el && !el.disabled && (el.getClientRects ? el.getClientRects().length > 0 : el.offsetParent !== null);
  const inputs = query(document, "input").filter(vis).filter((i) => i.type !== "hidden" && i.type !== "checkbox");
  if (!inputs.length || inputs.some(i => i.type === "password")) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  const put = (el, v) => { el.focus(); setter.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true, composed: true })); el.dispatchEvent(new Event("change", { bubbles: true, composed: true })); };
  const boxes = inputs.filter((i) => i.maxLength === 1);
  if (boxes.length >= code.length) code.split("").forEach((c, i) => put(boxes[i], c));
  else {
    const field = inputs.find(i => i.autocomplete === "one-time-code" || /otp|pin|token|code|verification/i.test(`${i.name} ${i.id} ${i.placeholder} ${i.getAttribute("aria-label") || ""}`));
    if (!field) return;
    put(field, code);
  }
  const buttons = query(document, "button, input[type=submit]").filter(b => vis(b) && /^(verify|continue|submit|next|confirm|log ?in)$/i.test((b.value || b.textContent?.trim() || b.getAttribute("aria-label") || b.getRootNode?.().host?.textContent || "").trim()));
  if (buttons.length === 1) buttons[0].click();
}

// ---- scenario submission: one option at a time per insurer; insurers run in parallel tabs ----
async function runScenarios(tabId, job, scenarios) {
  if (!Array.isArray(scenarios) || job.running || job.cancelled) return;
  job.running = true;
  const initialKey = `portal-${tabId}`;
  const route = (await chrome.storage.session.get(initialKey))[initialKey];
  if(job.cancelled){job.running=false;return;}
  if (route) await chrome.storage.session.set({ [initialKey]: { ...route, batchOpen: true } });
  let allSaved = true;
  try {
    for (const sc of scenarios.slice(0, 6)) {
      if (job.cancelled) { allSaved = false; break; }
      const n = Number(sc?.n);
      const fields = (Array.isArray(sc?.fields) ? sc.fields : []).slice(0, 100).filter((f) => typeof f?.label === "string" && typeof f?.value === "string" && f.value.length <= 160);
      if (!Number.isInteger(n) || n < 1 || n > 6) continue;
      job.currentScenario = n; job.pdfSeen = false; job.pdfSaved = false; job.currentCaptureId = undefined;
      tell(job, { type: "insurer-quote-status", n, status: "submitting" });
      let step = "start", stopped = false, context = {};
      const omp = job.insurer === "Old Mutual";
      for (let attempt = 0; attempt < (omp ? 120 : 25) && !job.pdfSeen; attempt++) {
        if (job.cancelled) { stopped = true; break; }
        const currentTabId = job.portalTabId || tabId;
        const tab = await chrome.tabs.get(currentTabId).catch(() => null);
        if (job.cancelled) { stopped = true; break; }
        if (Date.now() >= job.expires || !tab || !portalAllowed(tab.url, job)) {
          tell(job, { type: "insurer-quote-status", n, status: "failed", detail: "Quote session expired or portal left its trusted origin. Reconnect and retry." }); stopped = true; break;
        }
        const [res] = await chrome.scripting.executeScript({ target: { tabId: currentTabId }, func: omp ? driveOldMutualQuote : driveQuoteJourney, args: [{ insurer: job.insurer, step, context, fields, copy: /^brightrock/i.test(job.insurer) && !!job.savedScenario }, job.origin, job.discoveryRedirects] }).catch(() => [{}]);
        const r = res?.result;
        if (job.cancelled) { stopped = true; break; }
        if (omp && r?.state === "verified") {
          tell(job, { type: "insurer-quote-calculated", n, result: r.result });
          tell(job, { type: "insurer-quote-status", n, status: "calculated", detail: "Calculation verified. PDF still needs to be filed; no application was submitted." });
          stopped = true; break;
        }
        if (!r || !["navigate", "calculated", "report", "download"].includes(r.state)) {
          if (!r || /unique.*action|control not found|trusted quote workspace|unexpected portal dialog/i.test(r.detail || "")) void interfaceMonitor?.scan("quote-blocked", currentTabId).catch(() => {});
          tell(job, { type: "insurer-quote-status", n, status: "no-fields", detail: r?.detail || "Could not verify the quote screen." }); stopped = true; break;
        }
        tell(job, { type: "insurer-quote-status", n, status: r.state === "navigate" ? "submitting" : "generating", detail: r.detail });
        if (r.state === "download") break;
        step = r.next || step;
        if (omp && r.context && typeof r.context === "object") context = r.context;
        await new Promise((ok) => setTimeout(ok, 1800));
      }
      if (stopped) { allSaved = false; break; }
      for (let t = 0; t < 60 && !job.pdfSaved && !job.cancelled; t++) await new Promise((ok) => setTimeout(ok, 2000));
      if (job.cancelled) { allSaved = false; break; }
      if (!job.pdfSaved) {
        tell(job, { type: "insurer-quote-status", n, status: "failed", detail: "No saved PDF acknowledgement. Paused to avoid assigning a late PDF to the next quote." }); allSaved = false; break;
      }
      job.savedScenario = n;
    }
  } finally {
    job.running = false;
    if (job.cancelled) return;
    const current = job.portalTabId || tabId;
    const key = `portal-${current}`;
    const route = (await chrome.storage.session.get(key))[key];
    if (route) {
      await chrome.storage.session.set({ [key]: { ...route, batchOpen: !allSaved } });
      if (allSaved && !route.pendingCaptures?.length) {
        for (const [id, entry] of jobs) if (entry === job) { jobs.delete(id); await chrome.storage.session.remove(`portal-${id}`); await chrome.tabs.remove(id).catch(() => {}); }
      }
    }
  }
}
