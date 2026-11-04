import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("./background.js", import.meta.url), "utf8");
const journey = readFileSync(new URL("./portalJourney.js", import.meta.url), "utf8");
const ompJourney = readFileSync(new URL("./oldMutualJourney.js", import.meta.url), "utf8");
function harness({ holdDelay = false, holdCreation = false } = {}) {
  const delays = [], creations = [];
  const listeners = {}, stored = {}, tabs = new Map(), removed = [], sent = [], created = [], injected = [], windowChanges = [], tabChanges = [];
  const chrome = {
    alarms: { create: () => {}, onAlarm: { addListener: fn => { listeners.alarm = fn; } } },
    runtime: { onMessage: { addListener: (fn) => { listeners.message = fn; } } },
    tabs: {
      sendMessage: async (id, message) => { sent.push(message); },
      create: (options, cb) => { created.push(options); tabs.set(2, { id: 2, url: options.url }); if (holdCreation) creations.push(cb); else cb({ id: 2 }); },
      get: async (id) => tabs.get(id),
      remove: async (id) => { removed.push(id); listeners.removed(id); },
      reload: async () => {},
      onRemoved: { addListener: (fn) => { listeners.removed = fn; } },
      onUpdated: { addListener: (fn) => { listeners.updated = fn; } },
      onCreated: { addListener: (fn) => { listeners.created = fn; } },
      update: async (id, options) => { tabChanges.push({ id, ...options }); },
    },
    storage: { session: {
      get: async (key) => structuredClone(key ? { [key]: stored[key] } : stored),
      set: async (value) => { Object.assign(stored, structuredClone(value)); },
      remove: async (key) => { delete stored[key]; },
    } },
    scripting: { executeScript: async (options) => { injected.push(options); return [{ result: options.func.name === "readPdf" ? { base64: "JVBERi0=" } : options.func.name === "driveQuoteJourney" ? { state: "blocked" } : { state: "otp" } }]; } },
    downloads: { onCreated: { addListener: (fn) => { listeners.download = fn; } } },
    windows: { update: async (id, options) => { windowChanges.push({ id, ...options }); }, create: (options, cb) => { windowChanges.push({ create: true }); created.push(options); tabs.set(2, { id: 2, url: options.url }); cb({ id: 9, tabs: [{ id: 2 }] }); } },
  };
  const context = vm.createContext({ chrome, URL, Date, Map, Object, Number, Promise, setTimeout: (fn, ms) => { if (ms === 1200) { if (holdDelay) delays.push(fn); else fn(); } }, TextDecoder, Uint8Array });
  context.crypto = { randomUUID: () => "test-recovery-id" };
  context.importScripts = () => vm.runInContext(journey + '\n' + ompJourney, context);
  vm.runInContext(source, context);
  const sender = { tab: { id: 1, windowId: 7, url: "https://holarc.co.za/app-integrations" } };
  tabs.set(1, sender.tab);
  const login = (overrides = {}) => listeners.message({ type: "insurer-login", insurer: "discovery", workflowId: "georgia-demo", loginUrl: "https://partner.discovery.co.za/partner/login", username: "test-only", password: "test-only", ...overrides }, sender);
  return { context, listeners, stored, tabs, delays, creations, removed, sent, created, injected, sender, login, windowChanges, tabChanges };
}
const flush = async () => { for (let i = 0; i < 25; i++) await Promise.resolve(); };

describe("Companion background portal rules", () => {
  it("returns an OMP calculation without claiming a saved PDF or starting the next option", async () => {
    const h=harness();h.login({insurer:'Old Mutual',loginUrl:'https://secure.adviserweb.oldmutual.co.za/dashboard/sales-dashboard'});
    h.context.chrome.scripting.executeScript=async options=>{h.injected.push(options);return [{result:{state:'verified',result:{product:'Life cover',number:'12345',monthlyPremium:768,cashbackPremium:85}}}];};
    await vm.runInContext('runScenarios(2,jobs.get(2),[{n:1,fields:[]},{n:2,fields:[]}])',h.context);
    expect(h.injected).toHaveLength(1);
    expect(h.injected[0].func.name).toBe('driveOldMutualQuote');
    expect(h.sent.some(m=>m.type==='insurer-quote-calculated'&&m.n===1&&m.result.number==='12345')).toBe(true);
    expect(h.sent.some(m=>m.status==='captured')).toBe(false);
    expect(h.sent.some(m=>m.n===2)).toBe(false);
    expect(h.removed).toHaveLength(0);
  });
  it("verifies a refreshed session without opening tabs or passing credentials", async () => {
    const h = harness();
    h.stored["portal-2"] = { appTabId: 1, insurer: "Old Mutual", workflowId: "demo", ownerId: "broker", integrationId: "om", origin: "https://secure.adviserweb.oldmutual.co.za", discoveryRedirects: "oldmutual.co.za", connected: true };
    h.tabs.set(2, { id: 2, url: "https://secure.adviserweb.oldmutual.co.za/protection/quote" });
    h.context.chrome.scripting.executeScript = async options => { h.injected.push(options); return [{ result: { state: "in" } }]; };
    h.listeners.message({ type: "insurer-session-status", insurer: "Old Mutual", workflowId: "demo", ownerId: "broker", integrationId: "om", requestId: "refresh" }, h.sender);
    await flush();
    expect(h.sent.at(-1).state).toBe("connected");
    expect(h.sent.at(-1).requestId).toBe("refresh");
    expect(h.injected[0].args.slice(0, 2)).toEqual(["", ""]);
    expect(h.injected[0].args[6]).toBe(true);
    expect(h.created).toHaveLength(0);
    h.listeners.message({ type: "insurer-session-status", insurer: "Old Mutual", workflowId: "demo", ownerId: "other", integrationId: "om", requestId: "wrong-owner" }, h.sender);
    await flush(); expect(h.sent.at(-1).state).toBe("missing"); expect(h.injected).toHaveLength(1);
  });
  it("opens insurer logins in inactive tabs without creating native windows", () => {
    const h = harness(); h.login(); expect(h.created[0].active).toBe(false); expect(h.created[0].windowId).toBe(7); expect(h.windowChanges).toEqual([]);
    const m = harness(); m.login({ insurer: "Momentum", loginUrl: "https://adviser.momentum.co.za/login" }); expect(m.created[0].active).toBe(false); expect(m.windowChanges).toEqual([]);
    expect(h.sent[0].phase).toBe("opening");
  });
  it("keeps OTP injection in the background", async () => {
    const h = harness(); h.login(); h.listeners.message({ type: "insurer-otp", insurer: "discovery", workflowId: "georgia-demo", otp: "123456" }, h.sender);
    await flush(); expect(h.injected[0].func.name).toBe("fillOtp"); expect(h.created).toHaveLength(1);
  });
  it("accepts HTTPS Discovery Partner redirects and updates PDF routing", async () => {
    const h = harness(); h.login(); h.tabs.set(2, { url: "https://login.discovery.co.za/verify" });
    await vm.runInContext("checkPortal(2)", h.context);
    expect(h.injected).toHaveLength(1); expect(h.stored["portal-2"].origin).toBe("https://login.discovery.co.za");
  });
  it.each(["https://discovery.co.za.evil.example/login", "http://partner.discovery.co.za/login", "https://unrelated.example/login", "https://partner.discovery.co.za:444/login"])("rejects unsafe redirect %s before credential injection", async (url) => {
    const h = harness(); h.login(); h.tabs.set(2, { url }); await vm.runInContext("checkPortal(2)", h.context);
    expect(h.injected).toHaveLength(0); expect(h.sent.at(-1).ok).toBe(false);
  });
  it("does not allow another insurer to use Discovery redirect trust", async () => {
    const h = harness(); h.login({ insurer: "momentum", loginUrl: "https://momentum.co.za/login" }); h.tabs.set(2, { url: "https://partner.discovery.co.za/login" });
    await vm.runInContext("checkPortal(2)", h.context); expect(h.injected).toHaveLength(0);
  });
  it("closes only on a matching successful save acknowledgement and does not report failure", async () => {
    const h = harness(); h.login(); await h.listeners.download({ id: 9, filename: "quote.pdf", url: "https://partner.discovery.co.za/quote.pdf" });
    const ack = { type: "insurer-pdf-ack", workflowId: "georgia-demo", captureId: "2-9", ok: true };
    h.listeners.message({ ...ack, ok: false }, h.sender);
    h.listeners.message({ ...ack, workflowId: "other" }, h.sender);
    h.listeners.message(ack, { tab: { id: 3, url: "https://holarc.co.za" } });
    await flush(); expect(h.removed).toEqual([]);
    h.listeners.message(ack, h.sender); await flush();
    expect(h.removed).toEqual([2]); expect(h.stored["portal-2"]).toBeUndefined();
    expect(h.sent.some((m) => m.ok === false)).toBe(false);
  });
  it("retains portal until all pending PDFs are acknowledged", async () => {
    const h = harness(); h.login();
    for (const id of [9, 10]) await h.listeners.download({ id, filename: "quote.pdf", url: "https://partner.discovery.co.za/quote.pdf" });
    h.listeners.message({ type: "insurer-pdf-ack", workflowId: "georgia-demo", captureId: "2-9", ok: true }, h.sender);
    await flush(); expect(h.removed).toEqual([]);
    h.listeners.message({ type: "insurer-pdf-ack", workflowId: "georgia-demo", captureId: "2-10", ok: true }, h.sender);
    await flush(); expect(h.removed).toEqual([2]);
  });
  it("does not close after Quote 1 acknowledgement while other scenarios are running", async () => {
    const h = harness(); h.login();
    vm.runInContext("jobs.get(2).running = true; jobs.get(2).currentScenario = 1", h.context);
    await h.listeners.download({ id: 9, filename: "quote.pdf", url: "https://partner.discovery.co.za/quote.pdf" });
    expect(h.sent.find((m) => m.type === "insurer-pdf").n).toBe(1);
    h.listeners.message({ type: "insurer-pdf-ack", workflowId: "georgia-demo", captureId: "2-9", ok: true }, h.sender);
    await flush(); expect(h.removed).toEqual([]); expect(vm.runInContext("jobs.get(2).pdfSaved", h.context)).toBe(true);
  });
  it("ignores quote popups on another origin", async () => {
    const h = harness(); h.login(); vm.runInContext("jobs.get(2).running = true", h.context);
    await h.listeners.created({ id: 3, openerTabId: 2, url: "https://evil.example/quote" });
    expect(h.stored["portal-3"]).toBeUndefined(); expect(h.injected).toEqual([]);
  });
  it("reports a numbered scenario as no-fields when the portal screen has no matching fields", async () => {
    const h = harness(); h.login();
    h.listeners.message({ type: "insurer-quote-submit", insurer: "discovery", workflowId: "georgia-demo", scenarios: [{ n: 1, fields: [{ label: "Benefit amount", value: "1000000" }] }] }, h.sender);
    await flush();
    expect(h.injected.at(-1).func.name).toBe("driveQuoteJourney");
    expect(h.sent.filter((m) => m.type === "insurer-quote-status").map((m) => [m.n, m.status])).toEqual([[1, "submitting"], [1, "no-fields"]]);
  });
  it("never submits a scenario into an untrusted page", async () => {
    const h = harness(); h.login(); h.tabs.set(2, { id: 2, url: "https://unrelated.example/quote" });
    h.listeners.message({ type: "insurer-quote-submit", insurer: "discovery", workflowId: "georgia-demo", scenarios: [{ n: 2, fields: [] }] }, h.sender);
    await flush();
    expect(h.injected.some((i) => i.func.name === "driveQuoteJourney")).toBe(false);
    expect(h.sent.at(-1)).toMatchObject({ n: 2, status: "failed" });
  });
  it("ignores unrelated PDF origins", async () => {
    const h = harness(); h.login(); await h.listeners.download({ id: 9, filename: "quote.pdf", url: "https://unrelated.example/quote.pdf" });
    expect(h.injected).toHaveLength(0); expect(h.sent.some((m) => m.type === "insurer-pdf")).toBe(false);
  });
  it("routes a Discovery screen scan only from its initiating app and workflow", async () => {
    const h = harness(); h.login();
    h.listeners.message({ type: "insurer-scan", insurer: "discovery", workflowId: "other" }, h.sender);
    h.listeners.message({ type: "insurer-scan", insurer: "discovery", workflowId: "georgia-demo" }, { tab: { id: 3, url: h.sender.tab.url } });
    await flush(); expect(h.injected).toHaveLength(0);
    h.listeners.message({ type: "insurer-scan", insurer: "discovery", workflowId: "georgia-demo" }, h.sender);
    await flush(); expect(h.injected[0].func.name).toBe("scanQuoteScreen");
  });
  it("does not scan unsafe redirects or expired sessions", async () => {
    const h = harness(); h.login(); h.tabs.set(2, { url: "https://evil.example/quote" });
    await vm.runInContext("scanPortal(2, jobs.get(2))", h.context); expect(h.injected).toHaveLength(0);
    vm.runInContext("jobs.get(2).expires = 0", h.context);
    await vm.runInContext("scanPortal(2, jobs.get(2))", h.context); expect(h.injected).toHaveLength(0);
  });
});

describe("Discovery scan privacy", () => {
  const element = (label, overrides = {}) => ({ tagName: "INPUT", type: "text", labels: [{ textContent: label }], getClientRects: () => [1], getAttribute: () => null, required: false, disabled: false, ...overrides });
  const scan = (inputs) => {
    const h = harness();
    Object.assign(h.context, { location: { href: "https://partner.discovery.co.za/quote" }, getComputedStyle: () => ({ visibility: "visible" }), document: { querySelectorAll: (s) => s === "iframe" ? [] : inputs } });
    return vm.runInContext('scanQuoteScreen("https://partner.discovery.co.za", true)', h.context);
  };
  it("never exports entered amounts, client identity or credentials", () => {
    const result = scan([element("Benefit amount", { value: "SECRET-AMOUNT" }), element("Client name", { value: "SECRET-NAME" }), element("Email", { value: "SECRET-EMAIL" }), element("Cover", { name: "id_number", value: "SECRET-ID" })]);
    expect(result.fields).toHaveLength(1); expect(result.fields[0].label).toBe("Benefit amount");
    expect(JSON.stringify(result)).not.toContain("SECRET"); expect(result.blocked).toBe(3);
  });
  it.each([element("Password", { type: "password" }), element("Code", { autocomplete: "one-time-code" })])("returns no fields on authentication screens", (auth) => {
    const result = scan([auth, element("Benefit amount")]);
    expect(result.state).toBe("verification"); expect(result.fields).toHaveLength(0);
  });
  it("exports static quote options but excludes personalized dropdown choices", () => {
    const result = scan([element("Premium pattern", { tagName: "SELECT", options: [{ textContent: "Level" }, { textContent: "Georgia Adams" }, { textContent: "test@example.com" }, { textContent: "Age-rated" }] })]);
    expect([...result.fields[0].options]).toEqual(["Level", "Age-rated"]);
  });
  it("does not treat an empty dashboard as a confirmed quote form", () => {
    expect(scan([]).state).toBe("no-fields");
  });
});
describe("Companion avoids window flicker", () => {
  it("never minimises the broker's browser for a managed same-window popup", async () => {
    const h = harness(); h.login(); vm.runInContext("jobs.get(2).running = true",h.context);
    await h.listeners.created({ id: 3, openerTabId: 2, url: "https://partner.discovery.co.za/quote", windowId: 7, active: true });
    expect(h.windowChanges).toEqual([]); expect(h.tabChanges).toContainEqual({ id: 1, active: true });
  });
  it("does not activate Holarc or minimise a separate insurer-created window", async () => {
    const h = harness(); h.login(); vm.runInContext("jobs.get(2).running = true",h.context);
    await h.listeners.created({ id: 3, openerTabId: 2, url: "https://partner.discovery.co.za/quote", windowId: 9, active: true });
    expect(h.windowChanges).toEqual([]); expect(h.tabChanges.some(change => change.id === 1 && change.active)).toBe(false);
  });
});

describe("Stop Companion attempts", () => {
  it("clears the selected job and credentials, stops later polling and leaves the portal open", async () => {
    const h=harness();h.login({connectionAttemptId:"current"});
    const job=vm.runInContext("jobs.get(2)",h.context);
    h.listeners.message({type:"insurer-stop",insurer:"discovery",workflowId:"georgia-demo",connectionAttemptId:"current"},h.sender);
    await flush();await vm.runInContext("checkPortal(2)",h.context);
    expect(vm.runInContext("jobs.size",h.context)).toBe(0);expect(job.username).toBe("");expect(job.password).toBe("");
    expect(h.injected).toEqual([]);expect(h.removed).toEqual([]);expect(h.stored["portal-2"]).toBeUndefined();
    expect(h.sent.at(-1).type).toBe("insurer-stopped");expect(h.sent.some(m=>m.type==="insurer-login-result"&&m.ok===false)).toBe(false);
  });
  it("cannot stop another app tab or a different attempt", async () => {
    const h=harness();h.login({connectionAttemptId:"current"});
    const request={type:"insurer-stop",insurer:"discovery",workflowId:"georgia-demo",connectionAttemptId:"current"};
    h.listeners.message(request,{tab:{id:8,url:"https://holarc.co.za/app-integrations"}});
    h.listeners.message({...request,connectionAttemptId:"old"},h.sender);await flush();
    expect(vm.runInContext("jobs.size",h.context)).toBe(1);
  });
  it("stops before injection when Stop arrives during the page-load wait", async () => {
    const h=harness({holdDelay:true});h.login();const checking=vm.runInContext("checkPortal(2)",h.context);await flush();
    expect(h.delays).toHaveLength(1);h.listeners.message({type:"insurer-stop",insurer:"discovery",workflowId:"georgia-demo"},h.sender);await flush();h.delays[0]();await checking;
    expect(h.injected).toEqual([]);
  });
  it("does not start a job if Stop arrives before Chrome creates its tab", async () => {
    const h=harness({holdCreation:true});h.login();h.listeners.message({type:"insurer-stop",insurer:"discovery",workflowId:"georgia-demo"},h.sender);h.creations[0]({id:2});await flush();
    expect(vm.runInContext("jobs.size",h.context)).toBe(0);expect(h.stored["portal-2"]).toBeUndefined();expect(h.removed).toEqual([]);
  });
  it("preserves an already submitted PDF save acknowledgement without closing the stopped portal", async () => {
    const h=harness();h.login();await h.listeners.download({id:9,filename:"quote.pdf",url:"https://partner.discovery.co.za/quote.pdf"});
    h.listeners.message({type:"insurer-stop",insurer:"discovery",workflowId:"georgia-demo"},h.sender);await flush();expect(h.stored["portal-2"].cancelled).toBe(true);
    h.listeners.message({type:"insurer-pdf-ack",workflowId:"georgia-demo",captureId:"2-9",ok:true},h.sender);await flush();expect(h.removed).toEqual([]);expect(h.stored["portal-2"]).toBeUndefined();
  });
  it("stops a scenario batch after an in-flight action returns", async () => {
    const h=harness();h.login();let resolve;
    h.context.chrome.scripting.executeScript=options=>{h.injected.push(options);return new Promise(done=>resolve=done);};
    h.listeners.message({type:"insurer-quote-submit",insurer:"discovery",workflowId:"georgia-demo",scenarios:[{n:1,fields:[]},{n:2,fields:[]}]},h.sender);await flush();
    const stoppedAt=h.sent.length;h.listeners.message({type:"insurer-stop",insurer:"discovery",workflowId:"georgia-demo"},h.sender);await flush();resolve([{result:{state:"navigate",next:"capture"}}]);await flush();
    expect(h.injected).toHaveLength(1);expect(h.sent.slice(stoppedAt).some(m=>m.type==="insurer-quote-status")).toBe(false);expect(h.removed).toEqual([]);
  });
});

describe("Expired portal sessions", () => {
  function connected(h) {
    h.login({ autoReconnect:true, integrationId:"discovery-id", ownerId:"broker", connectionAttemptId:"attempt" });
    vm.runInContext("Object.assign(jobs.get(2), {done:true,connected:true,username:'',password:''})", h.context);
    h.context.chrome.scripting.executeScript=async options=>{h.injected.push(options);return[{result:{state:options.args?.[6]?'login':'submitted',credentialStep:'password'}}];};
  }
  const response={type:'insurer-reconnect-credentials',insurer:'discovery',workflowId:'georgia-demo',connectionAttemptId:'attempt',recoveryId:'test-recovery-id',username:'renewed-user',password:'renewed-password'};
  it("restores only routing metadata after a worker restart and keeps the actual PDF origin",async()=>{
    const h=harness();connected(h);h.stored['portal-2'].origin='https://login.discovery.co.za';
    await vm.runInContext('saveRoute(2,jobs.get(2))',h.context);
    expect(h.stored['portal-2'].origin).toBe('https://login.discovery.co.za');
    vm.runInContext('jobs.clear()',h.context);await h.listeners.alarm({name:'holarc-session-recovery'});
    expect(h.sent.at(-1).type).toBe('insurer-session-expired');expect(vm.runInContext('jobs.get(2).username',h.context)).toBe('');
    expect(JSON.stringify(h.stored)).not.toContain('test-only');
  });
  it("tracks only trusted broker-opened adviser tabs without changing their focus",async()=>{
    const h=harness();connected(h);await h.listeners.created({id:3,openerTabId:2,url:'https://partner.discovery.co.za/quotes'});
    expect(h.stored['portal-3'].connected).toBe(true);expect(h.stored['portal-3'].origin).toBe('https://partner.discovery.co.za');
    await h.listeners.created({id:4,openerTabId:2,url:'https://unrelated.example/quotes'});
    expect(h.stored['portal-4']).toBeUndefined();expect(h.tabChanges).toEqual([]);
  });
  it("probes without credentials and renews in the same tab, consuming a reply only once",async()=>{
    const h=harness();connected(h);await vm.runInContext('checkPortal(2)',h.context);
    expect(h.injected[0].args.slice(0,2)).toEqual(['','']);expect(h.injected[0].args[6]).toBe(true);
    expect(h.sent.at(-1).type).toBe('insurer-session-expired');expect(h.sent.at(-1).ownerId).toBe('broker');
    expect(JSON.stringify(h.stored)).not.toContain('renewed-password');
    h.listeners.message(response,h.sender);h.listeners.message(response,h.sender);await flush();
    expect(h.injected.filter(x=>x.args?.[0]==='renewed-user')).toHaveLength(1);
    expect(h.created).toHaveLength(1);expect(h.tabChanges).toEqual([]);expect(h.removed).toEqual([]);
    expect(JSON.stringify(h.stored)).not.toContain('renewed-password');
  });
  it("ignores a response from another app, another request, and a late response after Stop",async()=>{
    const h=harness();connected(h);await vm.runInContext('checkPortal(2)',h.context);const n=h.injected.length;
    h.listeners.message(response,{tab:{id:8,url:'https://holarc.co.za'}});
    h.listeners.message({...response,recoveryId:'unrelated'},h.sender);
    h.listeners.message({type:'insurer-stop',insurer:'discovery',workflowId:'georgia-demo'},h.sender);
    h.listeners.message(response,h.sender);await flush();expect(h.injected).toHaveLength(n);expect(h.removed).toEqual([]);
  });
  it("leaves locked credentials unsubmitted and rejects untrusted portal redirects",async()=>{
    const h=harness();connected(h);await vm.runInContext('checkPortal(2)',h.context);
    h.listeners.message({...response,username:undefined,password:undefined},h.sender);await flush();
    expect(h.sent.at(-1).phase).toBe('unlock-required');expect(h.injected).toHaveLength(1);
    h.tabs.set(2,{url:'https://discovery.co.za.evil.example/login'});await vm.runInContext('checkPortal(2)',h.context);expect(h.injected).toHaveLength(1);
  });
  it("does not recover login tests or jobs after a provider rejects renewal",async()=>{
    const h=harness();h.login();vm.runInContext('Object.assign(jobs.get(2),{done:true,connected:true})',h.context);
    await vm.runInContext('checkPortal(2)',h.context);expect(h.injected).toEqual([]);
    const r=harness();connected(r);await vm.runInContext('checkPortal(2)',r.context);
    r.context.chrome.scripting.executeScript=async options=>{r.injected.push(options);return[{result:{state:'failed',reason:'locked'}}];};
    r.listeners.message(response,r.sender);await flush();const n=r.injected.length;await vm.runInContext('checkPortal(2)',r.context);
    expect(r.injected).toHaveLength(n);expect(r.stored['portal-2'].autoReconnect).toBe(false);
    expect(vm.runInContext('jobs.get(2).password',r.context)).toBe('');
  });
  it("clears renewed credentials on success and does not replay quote scenarios",async()=>{
    const h=harness();connected(h);await vm.runInContext('checkPortal(2)',h.context);
    h.context.chrome.scripting.executeScript=async options=>{h.injected.push(options);return[{result:{state:'in'}}];};
    h.listeners.message(response,h.sender);await flush();await flush();
    expect(h.sent.some(x=>x.phase==='reconnected')).toBe(true);expect(h.stored['portal-2'].connected).toBe(true);
    expect(vm.runInContext('jobs.get(2).password',h.context)).toBe('');expect(h.injected.some(x=>x.func.name==='driveQuoteJourney')).toBe(false);
  });
});
