import { describe, expect, it } from "vitest";
import { decodePdf, MAX_PDF_BYTES } from "./pdf";
describe("Quote PDF limits", () => {
  it("limits uploads to 5MB", () => expect(MAX_PDF_BYTES).toBe(5242880));
  it("rejects non-PDF content", () => expect(() => decodePdf(btoa("<html>"))).toThrow());
  it("accepts a PDF header", () => expect(decodePdf(btoa("%PDF-1.7\n")).length).toBe(9));
});