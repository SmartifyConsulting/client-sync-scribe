import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOURCE_URL = "https://bwftujklwsdomdxmbotk.supabase.co";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SRC_KEY = Deno.env.get("GUARDIAN_SOURCE_SERVICE_KEY")!;
    if (!SRC_KEY) throw new Error("GUARDIAN_SOURCE_SERVICE_KEY missing");

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const callerId = userRes?.user?.id;
    if (!callerId) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    // Fetch source
    const fetchAll = async (table: string) => {
      const r = await fetch(`${SOURCE_URL}/rest/v1/${table}?select=*`, {
        headers: { apikey: SRC_KEY, Authorization: `Bearer ${SRC_KEY}` },
      });
      if (!r.ok) throw new Error(`Source ${table}: ${r.status} ${await r.text()}`);
      return await r.json();
    };

    const srcHospitals: any[] = await fetchAll("hospitals");
    const srcAmbulances: any[] = await fetchAll("ambulance_providers");

    // Find existing user IDs in this project to keep valid owner_ids
    const ownerIds = Array.from(new Set([
      ...srcHospitals.map((h) => h.owner_id),
      ...srcAmbulances.map((a) => a.owner_id),
    ].filter(Boolean)));
    let validOwnerSet = new Set<string>();
    if (ownerIds.length) {
      const { data: existing } = await admin.from("profiles").select("id").in("id", ownerIds);
      validOwnerSet = new Set((existing || []).map((p: any) => p.id));
    }

    const fixOwner = (id: string | null) =>
      id && validOwnerSet.has(id) ? id : callerId;

    const hospitalRows = srcHospitals.map((h) => ({
      id: h.id,
      owner_id: fixOwner(h.owner_id),
      name: h.name,
      registration_number: h.registration_number,
      address: h.address,
      city: h.city,
      state: h.state,
      country: h.country,
      contact_email: h.contact_email,
      contact_phone: h.contact_phone,
      latitude: h.latitude,
      longitude: h.longitude,
      services: h.services,
      bed_capacity: h.bed_capacity ?? 0,
      icu_capacity: h.icu_capacity ?? 0,
      beds_available: h.beds_available ?? 0,
      icu_available: h.icu_available ?? 0,
      at_capacity: h.at_capacity ?? false,
      tier: h.tier ?? "tier_3",
      status: h.status ?? "pending",
      subscription_status: h.subscription_status ?? "inactive",
      approved_at: h.approved_at,
      created_at: h.created_at,
      updated_at: h.updated_at,
    }));

    const ambRows = srcAmbulances.map((a) => ({
      id: a.id,
      owner_id: fixOwner(a.owner_id),
      company_name: a.company_name,
      registration_number: a.registration_number,
      contact_email: a.contact_email,
      contact_phone: a.contact_phone,
      fleet_size: a.fleet_size ?? 0,
      base_address: a.base_address,
      city: a.city,
      state: a.state,
      country: a.country,
      latitude: a.latitude,
      longitude: a.longitude,
      status: a.status ?? "pending",
      subscription_status: a.subscription_status ?? "inactive",
      approved_at: a.approved_at,
      dispatch_priority: a.dispatch_priority ?? 0,
      tier: a.tier ?? "tier_4",
      at_capacity: a.at_capacity ?? false,
      sos_voice_clip_path: a.sos_voice_clip_path,
      created_at: a.created_at,
      updated_at: a.updated_at,
    }));

    let hOk = 0, aOk = 0;
    if (hospitalRows.length) {
      const { error } = await admin.from("holarchelp_hospitals").upsert(hospitalRows, { onConflict: "id" });
      if (error) throw new Error(`Hospitals upsert: ${error.message}`);
      hOk = hospitalRows.length;
    }
    if (ambRows.length) {
      const { error } = await admin.from("holarchelp_ambulance_providers").upsert(ambRows, { onConflict: "id" });
      if (error) throw new Error(`Ambulances upsert: ${error.message}`);
      aOk = ambRows.length;
    }

    // Activate approved rows
    await admin.from("holarchelp_hospitals").update({ subscription_status: "active" }).eq("status", "approved");
    await admin.from("holarchelp_ambulance_providers").update({ subscription_status: "active" }).eq("status", "approved");

    return json({ hospitals_imported: hOk, ambulances_imported: aOk });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
