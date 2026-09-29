import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const PASSWORD = "Demo@2026";
const USERS = [
  { key: "client", email: "georgia.client@demo.holarcwealth.co.za", full_name: "Georgia Adams", role: "patient", extra: null },
  { key: "wm", email: "jaco.steyn@demo.holarcwealth.co.za", full_name: "Jaco Steyn", role: "doctor", extra: null },
  { key: "fsp", email: "sipho.nkosi@demo.holarcwealth.co.za", full_name: "Sipho Nkosi", role: "doctor", extra: null },
  { key: "insurer", email: "underwriting@demo.momentum.co.za", full_name: "Momentum Underwriting", role: "doctor", extra: "insurer_staff" },
] as const;

// Clients owned by the Wealth Manager, each at a different point of the journey.
const CLIENTS = [
  { first: "Georgia", last: "Adams", linkClient: true, scenario: "issued" },
  { first: "Naledi", last: "Mokoena", scenario: "new" },
  { first: "Hugh", last: "Carmichael", scenario: "presented" },
  { first: "Sasha", last: "Weinberg", scenario: "accepted" },
  { first: "Thabo", last: "Molefe", scenario: "underwriting" },
  { first: "Priya", last: "Pillay", scenario: "declined" },
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(token);
  if (!u?.user) return json({ error: "Please sign in" }, 401);
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "Only admins can create demo data" }, 403);

  const log: string[] = [];
  const ids: Record<string, string> = {};
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const x of USERS) {
    let id = list?.users.find((e) => e.email === x.email)?.id;
    if (!id) {
      const { data, error } = await admin.auth.admin.createUser({
        email: x.email, password: PASSWORD, email_confirm: true,
        user_metadata: { full_name: x.full_name, role: x.role },
      });
      if (error) return json({ error: `${x.email}: ${error.message}` }, 500);
      id = data.user.id;
      log.push(`created ${x.email}`);
    }
    ids[x.key] = id;
    await admin.from("profiles").update({ full_name: x.full_name, email_verified_at: new Date().toISOString(), onboarding_required: false } as any).eq("id", id);
    if (x.extra) await admin.from("user_roles").upsert({ user_id: id, role: x.extra } as any, { onConflict: "user_id,role" });
  }

  // Firm: FSP / Key Individual owns it, Wealth Manager is a member.
  let { data: firm } = await admin.from("practices").select("id").eq("owner_id", ids.fsp).maybeSingle();
  if (!firm) {
    const r = await admin.from("practices").insert({ name: "Cape Meridian Financial Services", owner_id: ids.fsp }).select("id").single();
    if (r.error) return json({ error: r.error.message }, 500);
    firm = r.data;
  }
  for (const [doc, role] of [[ids.fsp, "owner"], [ids.wm, "member"]] as const) {
    const { data: m } = await admin.from("practice_members").select("id").eq("practice_id", firm!.id).eq("doctor_id", doc).maybeSingle();
    if (!m) await admin.from("practice_members").insert({ practice_id: firm!.id, doctor_id: doc, role });
  }

  const now = Date.now();
  const iso = (d: number) => new Date(now + d * 864e5).toISOString();
  for (const c of CLIENTS) {
    const name = `${c.first} ${c.last}`;
    let { data: p } = await admin.from("patients").select("id").eq("user_id", ids.wm).eq("name", name).maybeSingle();
    if (p) continue; // already seeded
    const ins = await admin.from("patients").insert({
      user_id: ids.wm, name, first_name: c.first, last_name: c.last,
      email: (c as any).linkClient ? USERS[0].email : `${c.first.toLowerCase()}.${c.last.toLowerCase()}@example.co.za`,
      patient_user_id: (c as any).linkClient ? ids.client : null, is_sample: true,
    } as any).select("id").single();
    if (ins.error) { log.push(`${name}: ${ins.error.message}`); continue; }
    p = ins.data;
    if ((c as any).linkClient) {
      await admin.from("doctor_patient_access").insert({ doctor_id: ids.wm, patient_user_id: ids.client, is_active: true } as any);
    }
    const wf = await admin.from("wealth_workflows").insert({
      patient_id: p!.id, practice_id: firm!.id, owner_user_id: ids.wm, current_stage: "consultation", status: "active",
    }).select("id").single();
    if (wf.error) { log.push(`${name} workflow: ${wf.error.message}`); continue; }
    const w = wf.data.id;
    if (c.scenario === "new") continue;

    await admin.from("wealth_compliance_checks").insert({
      workflow_id: w,
      kyc_fica_status: c.scenario === "presented" ? "pending" : "completed",
      kyc_fica_completed_at: c.scenario === "presented" ? null : iso(-20),
      bank_validation_status: ["issued", "underwriting"].includes(c.scenario) ? "completed" : "pending",
      bank_validation_completed_at: ["issued", "underwriting"].includes(c.scenario) ? iso(-15) : null,
      declarations_status: ["issued", "underwriting"].includes(c.scenario) ? "completed" : "pending",
      declarations_completed_at: ["issued", "underwriting"].includes(c.scenario) ? iso(-15) : null,
    } as any);

    const recStatus = c.scenario === "presented" ? "presented" : c.scenario === "declined" ? "declined" : "accepted";
    const rec = await admin.from("wealth_recommendations").insert({
      workflow_id: w, version: 1, created_by: ids.wm,
      title: "Life cover, income protection and retirement top-up",
      summary: "R3m life cover (Momentum), R45k/month income protection, R7k/month retirement annuity contribution.",
      status: recStatus, presented_at: iso(-25),
      decided_at: recStatus === "presented" ? null : iso(-22),
      decision_reason: c.scenario === "declined" ? "Client chose to stay with current provider" : null,
      quote_expires_at: c.scenario === "presented" ? iso(5).slice(0, 10) : null,
    } as any).select("id").single();
    if (rec.error) { log.push(`${name} rec: ${rec.error.message}`); continue; }
    if (!["issued", "underwriting"].includes(c.scenario)) continue;

    const issued = c.scenario === "issued";
    for (const [product, provider] of issued
      ? [["Life Cover R3,000,000", "Momentum"], ["Income Protection R45,000/m", "Momentum"], ["Retirement Annuity R7,000/m", "Discovery"]]
      : [["Life Cover R2,500,000", "Momentum"]]) {
      await admin.from("wealth_applications").insert({
        workflow_id: w, recommendation_id: rec.data.id, product, provider,
        status: issued ? "issued" : "underwriting",
        submitted_at: iso(-12), issued_at: issued ? iso(-5) : null,
        review_date: issued ? iso(360).slice(0, 10) : null,
      } as any);
    }
    log.push(`${name}: ${c.scenario}`);
  }

  return json({ ok: true, password: "shared demo password set", log });
});
