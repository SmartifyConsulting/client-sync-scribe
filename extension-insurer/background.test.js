import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("./background.js", import.meta.url), "utf8");
function harness() {
  const listeners = {}, stored = {}, tabs = new Map(), removed = [], sent = [], created = [], injected = [];
  const chrome = {
    runtime: { onMessage: { addListener: (fn) => { listeners.message = fn; } } },
    tabs: {
      sendMessage: async (id, message) => { sent.push(message); },
      create: (options, cb) => { created.push(options); tabs.set(2, { id: 2, url: options.url }); cb({ id: 2 }); },
      get: async (id) => tabs.get(id),
      remove: async (id) => { removed.push(id); listeners.removed(id); },
      reload: async () => {},
      onRemoved: { addListener: (fn) => { listeners.removed = fn; } },
      onUpdated: { addListener: (fn) => { listeners.updated = fn; } },
    },
    storage: { session: {
      get: async (key) => structuredClone(key ? { [key]: stored[key] } : stored),
      set: async (value) => { Object.assign(stored, structuredClone(value)); },
      remove: async (key) => { delete stored[key]; },
    } },
    scripting: { executeScript: async (options) => { injected.push(options); return [{ result: options.func.name === "readPdf" ? { base64: "JVBERi0=" } : { state: "otp" } }]; } },
    downloads: { onCreated: { addListener: (fn) => { listeners.download = fn; } } },
  };
  const context = vm.createContext({ chrome, URL, Date, Map, Object, Number, Promise, setTimeout: (fn, ms) => { if (ms === 1200) fn(); }, TextDecoder, Uint8Array });
  vm.runInContext(source, context);
  const sender = { tab: { id: 1, url: "https://holarc.co.za/app-integrations" } };
  tabs.set(1, sender.tab);
  const login = (overrides = {}) => listeners.message({ type: "insurer-login", insurer: "discovery", workflowId: "georgia-demo", loginUrl: "https://partner.discovery.co.za/partner/login", username: "test-only", password: "test-only", ...overrides }, sender);
  return { context, listeners, stored, tabs, removed, sent, created, injected, sender, login };
}
const flush = async () => { for (let i = 0; i < 25; i++) await Promise.resolve(); };

describe("Companion background portal rules", () => {
  it("opens insurer login in an inactive tab", () => {
    const h = harness(); h.login(); expect(h.created[0].active).toBe(false);
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
  it("ignores unrelated PDF origins", async () => {
    const h = harness(); h.login(); await h.listeners.download({ id: 9, filename: "quote.pdf", url: "https://unrelated.example/quote.pdf" });
    expect(h.injected).toHaveLength(0); expect(h.sent).toHaveLength(0);
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