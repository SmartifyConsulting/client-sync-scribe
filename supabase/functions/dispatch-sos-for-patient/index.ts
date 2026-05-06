import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const {
      patient_user_id,
      latitude,
      longitude,
      accuracy,
      severity = "critical",
      coverage = "public",
    } = body ?? {};

    if (!patient_user_id || typeof latitude !== "number" || typeof longitude !== "number") {
      return new Response(JSON.stringify({ error: "Missing patient_user_id or coordinates" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify doctor has active access to this patient
    const { data: access } = await admin
      .from("doctor_patient_access")
      .select("id")
      .eq("doctor_id", user.id)
      .eq("patient_user_id", patient_user_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!access) {
      return new Response(JSON.stringify({ error: "No active access to this patient" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert incident on patient's behalf
    const { data: incident, error: insErr } = await admin
      .from("holarchelp_incidents")
      .insert({
        user_id: patient_user_id,
        status: "open",
        severity,
        coverage,
        triggered_by_user_id: user.id,
        triggered_by_role: "doctor",
      } as any)
      .select("id, tracking_token")
      .single();

    if (insErr || !incident) {
      return new Response(JSON.stringify({ error: insErr?.message ?? "Insert failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("holarchelp_locations").insert({
      incident_id: incident.id,
      latitude,
      longitude,
      accuracy: accuracy ?? null,
    } as any);

    await admin.from("holarchelp_incident_events").insert({
      incident_id: incident.id,
      actor_user_id: user.id,
      event_type: "sos_triggered_by_doctor",
      payload: { doctor_id: user.id, severity },
    } as any);

    // Notify all doctors connected to this patient
    const { data: doctors } = await admin
      .from("doctor_patient_access")
      .select("doctor_id")
      .eq("patient_user_id", patient_user_id)
      .eq("is_active", true);

    const { data: pat } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", patient_user_id)
      .maybeSingle();
    const { data: doc } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const patientName = pat?.full_name ?? "patient";
    const doctorName = doc?.full_name ?? "A practitioner";

    const recipients = new Set<string>([patient_user_id]);
    (doctors ?? []).forEach((r: any) => recipients.add(r.doctor_id));
    recipients.delete(user.id); // don't notify the trigger

    const notifs = Array.from(recipients).map((uid) => ({
      user_id: uid,
      type: "sos_incident",
      title: "Emergency SOS triggered",
      body: `${doctorName} triggered an SOS for ${patientName}.`,
      link: `/patient/holarchelp/incident/${incident.id}`,
    }));
    if (notifs.length > 0) {
      await admin.from("notifications").insert(notifs as any).then(() => {}, () => {});
    }

    // Fan-out provider offers via the existing dispatcher
    await admin.functions.invoke("dispatch-sos", {
      body: { incident_id: incident.id },
    }).catch(() => {});

    return new Response(JSON.stringify({ incident_id: incident.id, tracking_token: incident.tracking_token }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
