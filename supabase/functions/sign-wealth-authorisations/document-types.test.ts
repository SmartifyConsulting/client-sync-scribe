import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Check the persisted database rule, not the mocked signing service.
const migration = readFileSync(new URL("../../../drizzle/migrations/0017_allow_client_authorisation_document_types.sql", import.meta.url), "utf8");
const list = migration.match(/CHECK\s*\(doc_type IN\s*\(([^)]+)\)\)/i)?.[1];
if (!list) throw new Error("Document type constraint was not found");
const allowed = new Set(Array.from(list.matchAll(/'([^']+)'/g), match => match[1]));

describe("Signed document database types", () => {
  it.each(["disclosure", "loa", "debit_order", "life_declaration"])("allows %s signatures", kind => {
    expect(allowed.has(kind)).toBe(true);
  });
  it("continues to reject unsupported document types", () => {
    expect(allowed.has("unsupported_document")).toBe(false);
  });
});