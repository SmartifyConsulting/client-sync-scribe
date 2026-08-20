import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Runs on a schedule (pg_cron → pg_net → this function). For every active,
 * unacknowledged SOS incident, checks whether the current escalation tier
 * was notified more than WAIT_WINDOW_MINUTES ago with no one having opened
 * the tracking link yet. If so, escalates to the next contact tier by
 * calling share-incident-with-contacts as a trusted internal caller
 * (service-role key, not a patient session — there is none in a cron job).
 */

const WAIT_WINDOW_MINUTES = 3;
const ACTIVE_STATUSES = [
  "open",
  "assigned",
  "en_route",
  "arrived",
  "patient_collected",
  "at_hospital",
  "reopened",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const cutoff = new Date(Date.now() - WAIT_WINDOW_MINUTES * 60_000).toISOString();

    const { data: incidents, error } = await admin
      .from("holarchelp_incidents")
      .select("id, tracking_token, escalation_level, created_at")
      .in("status", ACTIVE_STATUSES)
      .is("first_contact_acknowledged_at", null);

    if (error) throw error;

    const results: any[] = [];

    for (const incident of incidents ?? []) {
      const currentLevel = (incident as any).escalation_level ?? 0;

      // When was the current tier last notified? Falls back to incident
      // creation time if no log row exists yet (shouldn't normally happen,
      // since the initial trigger always notifies tier 0 immediately).
      const { data: lastLog } = await admin
        .from("holarchelp_messaging_log")
        .select("created_at")
        .eq("incident_id", (incident as any).id)
        .eq("escalation_level", currentLevel)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastNotifiedAt = (lastLog as any)?.created_at ?? (incident as any).created_at;
      if (lastNotifiedAt > cutoff) continue; // still inside the wait window

      const nextLevel = currentLevel + 1;

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/share-incident-with-contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          incident_id: (incident as any).id,
          tracking_token: (incident as any).tracking_token,
          escalation_level: nextLevel,
        }),
      });

      const body = await resp.json().catch(() => ({}));
      results.push({ incident_id: (incident as any).id, escalated_to: nextLevel, ...body });
    }

    return new Response(JSON.stringify({ ok: true, checked: incidents?.length ?? 0, escalated: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
