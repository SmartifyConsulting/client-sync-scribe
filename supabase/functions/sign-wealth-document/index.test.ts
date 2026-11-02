import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import ts from "typescript";
import { z } from "zod";
import { describe, expect, it, vi } from "vitest";

const workflowId = "00000000-0000-4000-8000-000000000001";
const clientId = "00000000-0000-4000-8000-000000000002";
const signerId = "00000000-0000-4000-8000-000000000003";

function setup(linkedUser: string | null = signerId) {
  const tables: string[] = [];
  const saved: Record<string, unknown>[] = [];
  const rpc = vi.fn(async () => ({ data: false, error: null }));
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: signerId } } }) },
    rpc,
    from(table: string) {
      tables.push(table);
      let row: Record<string, unknown> | undefined;
      const chain = {
        select: () => chain,
        eq: () => chain,
        insert(value: Record<string, unknown>) { row = value; saved.push(value); return chain; },
        maybeSingle: async () => ({ data: table === "wealth_workflows" ? { id: workflowId, patient_id: clientId }
          : table === "clients" ? { user_id: "manager", patient_user_id: linkedUser } : null, error: null }),
        single: async () => ({ data: { id: "signed", ...row }, error: null }),
      };
      return chain;
    },
  };
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "");
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  runInNewContext(compiled, {
    corsHeaders: {}, createClient: () => client, z, Response, TextEncoder, crypto: webcrypto, console,
    Deno: { env: { get: () => "test-only" }, serve: (callback: typeof handler) => { handler = callback; } },
  });
  return {
    tables, saved, rpc,
    async sign(docType: "loa" | "disclosure") {
      if (!handler) throw new Error("Signing handler not registered");
      return handler(new Request("https://example.test/sign", {
        method: "POST", headers: { Authorization: "Bearer test-only", "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId, docType, title: "Test document", contentHtml: "<p>Fictional regression document</p>", signatureImage: "data:image/png;base64,dGVzdA==", signerName: "Fictional test signer" }),
      }));
    },
  };
}

describe("Client document signing", () => {
  it.each(["loa", "disclosure"] as const)("seals and files %s using the clients table, then checks onboarding", async (docType) => {
    const test = setup();
    expect((await test.sign(docType)).status).toBe(200);
    expect(test.tables).toContain("clients");
    expect(test.tables).not.toContain("patients");
    expect(test.saved[0]).toMatchObject({ doc_type: docType, signer_user_id: signerId, patient_id: clientId });
    expect(test.saved[0].seal_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(test.saved[1]).toMatchObject({ document_kind: `${docType}_signed`, patient_id: clientId });
    expect(test.rpc).toHaveBeenCalledWith("wealth_onboarding_refresh", { _workflow_id: workflowId });
  });
  it.each([null, "another-client"])("rejects signing when account link is %s", async (linkedUser) => {
    const test = setup(linkedUser);
    expect((await test.sign("loa")).status).toBe(403);
    expect(test.saved).toHaveLength(0);
    expect(test.rpc).not.toHaveBeenCalled();
  });
});