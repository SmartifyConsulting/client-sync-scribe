// Drives one insurer login per tab. Credentials live only in memory for the job.
const jobs = new Map(); // portalTabId -> job

function tell(job, msg) {
  chrome.tabs.sendMessage(job.appTabId, { insurer: job.insurer, workflowId: job.workflowId, ...msg }).catch(() => {});
}

chrome.runtime.onMessage.addListener((d, sender) => {
  const appTabId = sender.tab?.id;
  if (d.type === "insurer-login") {
    if (!d.loginUrl || !d.username || !d.password) {
      chrome.tabs.sendMessage(appTabId, { type: "insurer-login-result", insurer: d.insurer, workflowId: d.workflowId, ok: false, message: "No saved login address or password." });
      return;
    }
    chrome.tabs.create({ url: d.loginUrl, active: true }, (tab) => {
      jobs.set(tab.id, { ...d, appTabId, step: 0, done: false });
    });
    return;
  }
  const entry = [...jobs.entries()].find(([, j]) => j.insurer === d.insurer && j.appTabId === appTabId);
  if (!entry) return;
  const [tabId, job] = entry;
  if (d.type === "insurer-otp") {
    chrome.scripting.executeScript({ target: { tabId }, func: fillOtp, args: [d.otp] });
    chrome.tabs.update(tabId, { active: true });
  }
  if (d.type === "insurer-email-check") chrome.tabs.reload(tabId);
});

chrome.tabs.onRemoved.addListener((id) => jobs.delete(id));

chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  const job = jobs.get(tabId);
  if (!job || job.done || info.status !== "complete") return;
  job.step += 1;
  if (job.step > 6) { job.done = true; tell(job, { type: "insurer-login-result", ok: false, message: "The portal didn't finish logging in. Please finish in the insurer tab." }); return; }
  // Give single-page portals a moment to draw the form.
  await new Promise((r) => setTimeout(r, 1200));
  const [res] = await chrome.scripting.executeScript({ target: { tabId }, func: drive, args: [job.username, job.password] }).catch(() => [{}]);
  const r = res?.result || {};
  if (r.state === "otp") tell(job, { type: "insurer-challenge", method: "otp", hint: r.hint });
  else if (r.state === "email") tell(job, { type: "insurer-challenge", method: "email", hint: r.hint });
  else if (r.state === "submitted") tell(job, { type: "insurer-login-progress", state: "connecting" });
  else if (r.state === "in") { job.done = true; tell(job, { type: "insurer-login-result", ok: true }); }
});

// ---- injected into the insurer page ----
function drive(username, password) {
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
  if (pw) {
    if (user && !user.value) setVal(user, username);
    setVal(pw, password);
    submit(pw);
    return { state: "submitted" };
  }
  if (user && !user.value && /log ?in|sign ?in|username/i.test(text)) { setVal(user, username); submit(user); return { state: "submitted" }; }
  return { state: "in" };
}

function fillOtp(code) {
  const vis = (el) => el && el.offsetParent !== null && !el.disabled;
  const inputs = [...document.querySelectorAll("input")].filter(vis).filter((i) => i.type !== "hidden" && i.type !== "checkbox");
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  const put = (el, v) => { el.focus(); setter.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
  const boxes = inputs.filter((i) => i.maxLength === 1);
  if (boxes.length >= code.length) code.split("").forEach((c, i) => put(boxes[i], c));
  else put(inputs.find((i) => i.autocomplete === "one-time-code" || /otp|pin|token|code/i.test(`${i.name} ${i.id} ${i.placeholder}`)) || inputs[0], code);
  const btn = [...document.querySelectorAll("button, input[type=submit]")].find((b) => vis(b) && /verify|continue|submit|next|confirm|log ?in/i.test(b.value || b.textContent || ""));
  if (btn) btn.click();
}
