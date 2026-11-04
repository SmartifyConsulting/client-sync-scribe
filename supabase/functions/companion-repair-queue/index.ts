import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";
import { z } from "npm:zod@3";

// The GitHub repair workflow authenticates with a short-lived GitHub Actions OIDC token,
// so no backend service key ever leaves this project.
const REPO = "SmartifyConsulting/client-sync-scribe";
const WORKFLOW = `${REPO}/.github/workflows/companion-repair.yml@refs/heads/main`;
const AUDIENCE = "holarc-companion-repair";
const jwks = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));

const body = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("fetch"), incidentId: z.string().uuid().optional() }).strict(),
  z.object({
    mode: z.literal("finish"),
    incidentId: z.string().uuid(),
    prUrl: z.string().regex(/^https:\/\/github\.com\/SmartifyConsulting\/client-sync-scribe\/pull\/\d+$/).optional(),
  }).strict(),
]);
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export async function verifyWorker(token: string) {
  const { payload } = await jwtVerify(token, jwks, { issuer: "https://token.actions.githubusercontent.com", audience: AUDIENCE });
  if (payload.repository !== REPO || payload.workflow_ref !== WORKFLOW || payload.ref !== "refs/heads/main") throw new Error("untrusted workflow");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Worker token required" }, 401);
  try { await verifyWorker(token); } catch { return json({ error: "Untrusted worker" }, 403); }
  let input;
  try { input = body.parse(await request.json()); } catch { return json({ error: "Invalid request" }, 400); }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (input.mode === "fetch") {
    let query = admin.from("companion_interface_incidents")
      .select("id,integration_id,companion_version,evidence,app_integrations_catalog(name)")
      .eq("status", "queued").order("first_seen_at", { ascending: true }).limit(1);
    if (input.incidentId) query = query.eq("id", input.incidentId);
    const { data, error } = await query;
    if (error) return json({ error: "Queue unavailable" }, 500);
    const incident = data?.[0];
    if (!incident) return json({ incident: null });
    const { data: claimed } = await admin.from("companion_interface_incidents")
      .update({ status: "claimed" }).eq("id", incident.id).eq("status", "queued").select("id");
    return json({ incident: claimed?.length ? incident : null });
  }

  const { error } = await admin.from("companion_interface_incidents")
    .update({ status: input.prUrl ? "patch_ready" : "needs_review", repair_pr_url: input.prUrl ?? null })
    .eq("id", input.incidentId).eq("status", "claimed");
  if (error) return json({ error: "Could not record result" }, 500);
  return json({ ok: true });
});
