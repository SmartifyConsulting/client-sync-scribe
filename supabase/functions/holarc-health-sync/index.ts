import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({ patient_id: z.string().uuid() });

function dobFromId(id: string): string | null {
  if (!/^\d{13}$/.test(id)) return null;
  const yy = +id.slice(0, 2), mm = id.slice(2, 4), dd = id.slice(4, 6);
  const nowYY = new Date().getFullYear() % 100;
  return `${yy > nowYY ? 1900 + yy : 2000 + yy}-${mm}-${dd}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = Deno.env.get("SUPABASE_URL")!;
  const auth = req.headers.get("Authorization") ?? "";
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "Please sign in again." }, 401);

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "A client must be selected." }, 400);
  const pid = parsed.data.patient_id;

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: p } = await admin.from("patients").select("id, user_id, patient_user_id, id_passport_number, dob").eq("id", pid).maybeSingle();
  if (!p || (p.user_id !== u.user.id && p.patient_user_id !== u.user.id)) return json({ error: "You don't have access to this client." }, 403);

  const base = (Deno.env.get("HOLARC_HEALTH_API_URL") ?? "").replace(/\/$/, "");
  const key = Deno.env.get("HOLARC_HEALTH_API_KEY") ?? "";
  const H = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const { data: link } = await admin.from("holarc_health_links").select("*").eq("patient_id", pid).maybeSingle();
  const save = (patch: Record<string, unknown>) =>
    admin.from("holarc_health_links").upsert({ patient_id: pid, ...patch, updated_at: new Date().toISOString() });

  try {
    // 1. No request yet (or declined/expired) → create one
    if (!link?.request_id || ["declined", "expired"].includes(link.status)) {
      const idn = (p.id_passport_number ?? "").replace(/\s/g, "");
      const dob = p.dob ?? dobFromId(idn);
      if (!idn || !dob) {
        await save({ status: "missing_details", last_error: "ID number and date of birth are required." });
        return json({ status: "missing_details", message: "Add the ID number and date of birth in Personal Information, then try again." });
      }
      const r = await fetch(`${base}/access-requests`, {
        method: "POST", headers: H,
        body: JSON.stringify({ id_number: idn, date_of_birth: dob, categories: ["medical", "documents"], purpose: "Financial advice and underwriting", reference: pid }),
      });
      const b = await r.json().catch(() => ({}));
      if (r.status === 404) {
        await save({ status: "not_found", last_error: b.error ?? null });
        return json({ status: "not_found", message: "No matching Holarc Health account was found for this ID number and date of birth." });
      }
      if (!r.ok) throw new Error(typeof b.error === "string" ? b.error : `Holarc Health returned ${r.status}`);
      await save({ request_id: b.request_id, remote_patient_id: b.patient_id, status: b.status ?? "pending", last_error: null });
      return json({ status: b.status ?? "pending", message: "Approval request sent to the client's Holarc Health app." });
    }

    // 2. Check request status
    const sr = await fetch(`${base}/access-requests/${link.request_id}`, { headers: H });
    const sb = await sr.json().catch(() => ({}));
    if (!sr.ok) throw new Error(sb.error ?? `Holarc Health returned ${sr.status}`);
    if (sb.status !== "approved") {
      await save({ status: sb.status, last_error: null });
      return json({ status: sb.status, message: sb.status === "pending" ? "Still waiting for approval in Holarc Health." : `Request ${sb.status}.` });
    }

    // 3. Approved → pull medical + documents
    const rid = link.remote_patient_id ?? sb.patient_id;
    const [m, d] = await Promise.all([
      fetch(`${base}/patients/${rid}/medical`, { headers: H }).then((r) => r.json()),
      fetch(`${base}/patients/${rid}/documents`, { headers: H }).then((r) => r.json()),
    ]);
    const med = m?.data ?? {};
    const docs = d?.data ?? {};
    const payload = {
      chronic_conditions: med.conditions ?? [],
      chronic_medications: med.chronic_medications ?? null,
      is_chronic: med.is_chronic ?? null,
      prescriptions: docs.prescriptions ?? [],
      admissions: docs.admissions ?? [],
    };
    await save({ status: "approved", payload, synced_at: new Date().toISOString(), last_error: null });
    return json({ status: "approved", message: "Health records updated." });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("holarc-health-sync", msg);
    await save({ last_error: msg });
    return json({ error: "Holarc Health could not be reached. Please try again shortly." }, 502);
  }
});
