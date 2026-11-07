import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import ts from "typescript";
import { z } from "zod";
import { describe, it, expect, vi } from "vitest";

const id = "00000000-0000-4000-8000-000000000001";
function setup(link = id, rpcError: string | null = null) {
  const rpc = vi.fn(async () => ({ data: { documents: [1, 2] }, error: rpcError ? { message: rpcError } : null }));
  const client = { auth: { getUser: async () => ({ data: { user: { id } } }) }, rpc,
    from(table: string) { const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: table === "wealth_workflows" ? { patient_id: id } : { patient_user_id: link } }) }; return chain; } };
  let handler: ((r: Request) => Promise<Response>) | undefined;
  const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "");
  runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText,
    { corsHeaders: {}, createClient: () => client, z, Response, TextEncoder, crypto: webcrypto, Deno: { env: { get: () => "test" }, serve: (h: typeof handler) => { handler = h; } } });
  return { rpc, async call(overrides = {}) {
    if (!handler) throw new Error("Handler missing");
    return handler(new Request("https://example.test/sign", { method: "POST", headers: { Authorization: "Bearer test", "x-forwarded-for": "192.0.2.1" }, body: JSON.stringify({ workflowId: id, recommendationId: id, signerName: "Fictional Client", bankName: "Test Bank", accountHolder: "Fictional Client", accountNumber: "1234567890", collectionDay: 25, debitConsent: true, declarationConsent: true, signatureImage: "data:image/png;base64,dGVzdA==", quoteSnapshot: [{ id, insurer: "Test Insurer", product: "Life", monthly_premium: 783.25 }], ...overrides }) }));
  } };
}
describe("Client authorisation rules", () => {
  it("seals both documents in one transaction with server IP and masked account", async () => {
    const test = setup(); expect((await test.call()).status).toBe(200);
    const args = test.rpc.mock.calls[0]?.[1] as any;
    expect(args._documents).toHaveLength(2);
    expect(args._documents.map((d: any) => d.doc_type)).toEqual(["debit_order", "life_declaration"]);
    expect(args._documents[0]).toMatchObject({ signer_ip: "192.0.2.1" });
    expect(args._documents[0].content_html).toContain("7890");
    expect(args._documents[0].content_html).not.toContain("1234567890");
    expect(args._documents[0].content_html).toContain("783.25");
    expect(args._documents[0].seal_hash).toMatch(/^[a-f0-9]{64}$/);
  });
  it.each(["debitConsent", "declarationConsent"])("requires explicit %s", async field => {
    const test = setup(); expect((await test.call({ [field]: false })).status).toBe(400); expect(test.rpc).not.toHaveBeenCalled();
  });
  it("rejects a Wealth Manager signing for the client", async () => {
    const test = setup("another-user"); expect((await test.call()).status).toBe(403); expect(test.rpc).not.toHaveBeenCalled();
  });
  it("does not claim completion when the accepted ROA or premiums changed", async () => {
    const test = setup(id, "The selected premiums changed"); const response = await test.call(); expect(response.status).toBe(409); expect(await response.json()).toEqual({ error: "The selected premiums changed" });
  });
  it.each([0,32])("rejects collection day %s", async day => {
    const test = setup(); expect((await test.call({ collectionDay: day })).status).toBe(400); expect(test.rpc).not.toHaveBeenCalled();
  });
});