import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const source = readFileSync(new URL("./portalJourney.js", import.meta.url), "utf8");
function page({ insurer = "Momentum", step = "capture", fields = [], inputs = [], buttons = [], url = "https://portal.example/quote", copy = false } = {}) {
  const clicked = [];
  class Input { constructor(label, extra = {}) { Object.assign(this, { tagName: "INPUT", type: "text", labels: [{ textContent: label }], required: false, disabled: false, _value: "", ...extra }); } get value() { return this._value; } set value(v) { this._value = v; } get checked() { return this._checked || false; } set checked(v) { this._checked = v; } getClientRects() { return [1]; } getAttribute() { return null; } closest() { return null; } dispatchEvent() {} checkValidity() { return true; } }
  const elements = inputs.map((i) => new Input(i.label, i));
  const actions = buttons.map((textContent) => ({ textContent, getClientRects: () => [1], getAttribute: () => null, click: () => clicked.push(textContent) }));
  const context = vm.createContext({ URL, Set, location: { href: url }, HTMLInputElement: Input, Event: class {}, getComputedStyle: () => ({ visibility: "visible" }), document: { querySelectorAll: (s) => s === "input, select, textarea" ? elements : actions } });
  vm.runInContext(source, context);
  context.request = { insurer, step, fields, copy };
  const result = vm.runInContext('driveQuoteJourney(request, "https://portal.example", false)', context);
  return { result, clicked, elements };
}
describe("documented quote journeys", () => {
  it("follows Momentum calculator, life, launch and new quote actions", () => {
    for (const [step, button, next] of [["start", "Content Calculators", "type"], ["type", "Life insurance", "launch"], ["launch", "Get a Quote", "workspace"], ["workspace", "New Quote", "capture"]]) {
      const p = page({ step, buttons: [button] }); expect(p.clicked).toEqual([button]); expect(p.result.next).toBe(next);
    }
  });
  it("copies BrightRock saved alternatives instead of overwriting the original", () => {
    const p = page({ insurer: "BrightRock", step: "start", copy: true, buttons: ["Copy", "Create new quote"] });
    expect(p.clicked).toEqual(["Copy"]); expect(p.result.next).toBe("capture");
  });
  it("blocks Bidvest quotation because only sign-in was demonstrated", () => {
    const p = page({ insurer: "Bidvest Life / FMI", buttons: ["Calculate"] }); expect(p.result.state).toBe("blocked"); expect(p.clicked).toEqual([]);
  });
  it("preserves text values containing numbers and separates premium from benefit increases", () => {
    const p = page({ fields: [{ label: "Occupation", value: "Engineer level 2", kind: "text" }, { label: "Premium increase", value: "5", kind: "percent", product: "Life cover" }, { label: "Yearly base increase", value: "6", kind: "percent", product: "Life cover" }], inputs: [{ label: "Occupation" }, { label: "Premium increase" }, { label: "Yearly base increase" }], buttons: ["Calculate"] });
    expect(p.elements.map((i) => i.value)).toEqual(["Engineer level 2", "5", "6"]); expect(p.result.state).toBe("calculated");
  });
  it("does not calculate with missing required client data", () => {
    const p = page({ fields: [{ label: "Benefit amount", value: "1000000", product: "Life cover" }], inputs: [{ label: "Benefit amount" }, { label: "Policy start date", required: true }], buttons: ["Calculate"] });
    expect(p.result.state).toBe("blocked"); expect(p.clicked).toEqual([]);
  });
  it("does not calculate after a partial or ambiguous multi-product match", () => {
    const p = page({ fields: [{ label: "Benefit amount", value: "1000000", product: "Life cover" }, { label: "Benefit amount", value: "200000", product: "Severe illness" }], inputs: [{ label: "Benefit amount" }], buttons: ["Calculate"] });
    expect(p.result.state).toBe("blocked"); expect(p.clicked).toEqual([]);
  });
  it("never enters application acceptance/finalization or sends an email", () => {
    const p = page({ buttons: ["Accept Quote", "Complete Application", "Finalize", "Email", "Generate application"] }); expect(p.clicked).toEqual([]); expect(p.result.state).toBe("blocked");
  });
  it("rejects an untrusted popup before writing client fields", () => {
    const p = page({ url: "https://other.example/quote", inputs: [{ label: "First name" }], fields: [{ label: "First name", value: "Test" }], buttons: ["Next"] }); expect(p.result.state).toBe("blocked"); expect(p.elements[0].value).toBe("");
  });
  it("uses Momentum's demonstrated report action without inventing a BrightRock email/download flow", () => {
    expect(page({ step: "report", buttons: ["Generate Quote Report"] }).result.state).toBe("report");
    expect(page({ insurer: "BrightRock", step: "report", buttons: ["Email"] }).clicked).toEqual([]);
  });
});
describe("supplied Phase 2 manual screenshots", () => {
  it("opens BrightRock New cover proposal from part 2 page 2", () => {
    const p = page({ insurer: "BrightRock", step: "start", buttons: ["New cover proposal"] });
    expect(p.clicked).toEqual(["New cover proposal"]); expect(p.result.next).toBe("capture");
  });
  it("does not guess between duplicated New cover proposal controls", () => {
    const p = page({ insurer: "BrightRock", step: "start", buttons: ["New cover proposal", "New cover proposal"] });
    expect(p.clicked).toEqual([]); expect(p.result.state).toBe("blocked");
  });
  it("downloads Momentum's generated report using part 1 page 6 Download", () => {
    const p = page({ step: "download", buttons: ["Download", "Continue"] });
    expect(p.clicked).toEqual(["Download"]); expect(p.result.state).toBe("download");
  });
  it("does not infer a generic Download before report generation or for BrightRock", () => {
    for (const params of [{ step: "capture" }, { insurer: "BrightRock", step: "download" }]) {
      const p = page({ ...params, buttons: ["Download"] }); expect(p.clicked).toEqual([]); expect(p.result.state).toBe("blocked");
    }
  });
  it("sets an explicitly approved benefit checkbox before calculation", () => {
    const p = page({ fields: [{ label: "Accelerated", value: "true", kind: "toggle", product: "Severe illness" }], inputs: [{ label: "Accelerated", type: "checkbox" }], buttons: ["Calculate"] });
    expect(p.elements[0].checked).toBe(true); expect(p.result.state).toBe("calculated");
  });
  it("does not tick a required, unmapped consent checkbox", () => {
    const p = page({ inputs: [{ label: "Accept application terms", type: "checkbox", required: true }], buttons: ["Calculate"] });
    expect(p.elements[0].checked).toBe(false); expect(p.clicked).toEqual([]); expect(p.result.state).toBe("blocked");
  });
  it("blocks calculation until a required radio group is selected", () => {
    const p = page({ fields: [{ label: "Benefit amount", value: "1000000", product: "Life cover" }], inputs: [{ label: "Benefit amount" }, { label: "Natural Person", type: "radio", name: "person-status", required: true }, { label: "Company", type: "radio", name: "person-status", required: true }], buttons: ["Calculate"] });
    expect(p.result.state).toBe("blocked"); expect(p.clicked).toEqual([]);
  });
  it("does not guess quote paths for the providers not demonstrated in parts 1-3", () => {
    for (const insurer of ["Discovery", "Liberty", "Old Mutual", "Xplan"]) {
      const p = page({ insurer, buttons: ["New Quote", "Calculate", "Download"] }); expect(p.result.state).toBe("blocked"); expect(p.clicked).toEqual([]);
    }
  });
  it("uses BrightRock's demonstrated Finish - See the cover only after approved input", () => {
    const p = page({ insurer: "BrightRock", fields: [{ label: "Policy start date", value: "2026-12-01", kind: "text" }], inputs: [{ label: "Policy start date", required: true }], buttons: ["Finish - See the cover"] });
    expect(p.result.state).toBe("navigate"); expect(p.clicked).toEqual(["Finish - See the cover"]);
    expect(page({ insurer: "BrightRock", buttons: ["Finish - See the cover"] }).clicked).toEqual([]);
  });
  it("does not invent an automatic BrightRock export even when a generic PDF action exists", () => {
    for (const step of ["report", "download"]) {
      const p = page({ insurer: "BrightRock", step, buttons: ["Download PDF", "Email"] }); expect(p.clicked).toEqual([]); expect(p.result.state).toBe("blocked");
    }
  });
});
