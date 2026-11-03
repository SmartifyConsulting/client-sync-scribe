import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { File } from "node:buffer";
import ts from "typescript";
import { z } from "zod";
import { describe, expect, it } from "vitest";

const clientId = "00000000-0000-4000-8000-000000000002";
const sessionId = "00000000-0000-4000-8000-000000000003";
const transcript = "Fictional client earns R25000 net monthly and has R10000 fixed expenses.";

function setup(name: "transcribe-meeting" | "extract-financials", owner = "manager") {
  const saved: { table: string; row: Record<string, unknown> }[] = [];
  const client = {
    auth: { getClaims: async () => ({ data: { claims: { sub: "manager" } }, error: null }) },
    from(table: string) {
      const chain = {
        select: () => chain,
        eq: () => chain,
        insert: (row: Record<string, unknown>) => { saved.push({ table, row }); return chain; },
        upsert: async (row: Record<string, unknown>) => { saved.push({ table, row }); return { error: null }; },
        maybeSingle: async () => ({ data: table === "clients" ? { id: clientId, user_id: owner }
          : table === "sessions" ? { transcript, patient_id: clientId } : null, error: null }),
        single: async () => ({ data: { id: sessionId }, error: null }),
      };
      return chain;
    },
  };
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const source = readFileSync(new URL(`../${name}/index.ts`, import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "");
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  runInNewContext(compiled, {
    createClient: () => client, corsHeaders: {}, z, Response, File, FormData, console,
    fetch: async () => Response.json(name === "transcribe-meeting" ? { text: transcript }
      : { output_text: JSON.stringify({ cash_flow: { net_salary: 25000, fixed_expenses: 10000 } }) }),
    Deno: { env: { get: () => "test-only" }, serve: (callback: typeof handler) => { handler = callback; } },
  });
  return {
    saved,
    async request(key: "clientId" | "patientId", id = clientId) {
      if (!handler) throw new Error("Handler not registered");
      const headers: Record<string, string> = { Authorization: "Bearer test-only" };
      let body: FormData | string;
      if (name === "transcribe-meeting") {
        body = new FormData();
        body.append(key, id);
        body.append("file", new File(["fictional audio"], "meeting.webm", { type: "audio/webm" }));
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({ [key]: id, sessionId });
      }
      return handler(new Request("https://example.test/check", { method: "POST", headers, body }));
    },
  };
}

describe.each(["clientId", "patientId"] as const)("Meeting processing with %s", (key) => {
  it("saves the transcript and extracts financial facts for the same client", async () => {
    const recording = setup("transcribe-meeting");
    const result = await recording.request(key);
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ ok: true, sessionId });
    expect(recording.saved).toEqual([{ table: "sessions", row: {
      user_id: "manager", patient_id: clientId, title: "Financial health meeting", transcript, status: "completed",
    } }]);
    const extraction = setup("extract-financials");
    expect((await extraction.request(key)).status).toBe(200);
    expect(extraction.saved[0]).toMatchObject({ table: "client_financial_profiles", row: {
      patient_id: clientId, extracted_from_session_id: sessionId,
      cash_flow: { net_salary: 25000, fixed_expenses: 10000 },
    } });
  });
  it.each(["transcribe-meeting", "extract-financials"] as const)("rejects another manager in %s without saving", async (name) => {
    const test = setup(name, "another-manager");
    expect((await test.request(key)).status).toBe(403);
    expect(test.saved).toEqual([]);
  });
  it.each(["transcribe-meeting", "extract-financials"] as const)("rejects an invalid identifier in %s without saving", async (name) => {
    const test = setup(name);
    expect((await test.request(key, "invalid")).status).toBe(400);
    expect(test.saved).toEqual([]);
  });
});