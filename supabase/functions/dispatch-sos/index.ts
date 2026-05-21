import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const distKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { incident_id, exclude_provider_ids = [] } = await req.json();
    if (!incident_id) throw new Error("incident_id required");

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: incident } = await sb.from("holarchelp_incidents")
      .select("id, coverage").eq("id", incident_id).maybeSingle();
    if (!incident) throw new Error("incident not found");

    const { data: loc } = await sb.from("holarchelp_locations")
      .select("latitude, longitude").eq("incident_id", incident_id)
      .order("recorded_at", { ascending: false }).limit(1).maybeSingle();
    if (!loc) throw new Error("no location for incident");

    const center = { lat: loc.latitude as number, lng: loc.longitude as number };

    const { data: ambulances } = await sb.from("holarchelp_ambulance_providers")
      .select("id, company_name, latitude, longitude, ownership, accepting_patients, status, subscription_status")
      .eq("status", "approved").eq("subscription_status", "active").eq("accepting_patients", true)
      .not("latitude", "is", null).not("longitude", "is", null);
    const { data: hospitals } = await sb.from("holarchelp_hospitals")
      .select("id, name, latitude, longitude, ownership, accepting_patients, status, subscription_status")
      .eq("status", "approved").eq("subscription_status", "active").eq("accepting_patients", true)
      .not("latitude", "is", null).not("longitude", "is", null);

    // Defensive: drop rows without a usable display name
    const ambList = (ambulances ?? []).filter((r: any) => r?.company_name && String(r.company_name).trim().length > 0);
    const hospList = (hospitals ?? []).filter((r: any) => r?.name && String(r.name).trim().length > 0);

    const isPublicCoverage = (incident as any).coverage === "public";
    const tag = (rows: any[] | null, kind: string) =>
      (rows ?? [])
        .filter((p: any) => !exclude_provider_ids.includes(p.id))
        .map((p: any) => ({ ...p, _kind: kind, _d: distKm(center, { lat: p.latitude, lng: p.longitude }) }));
    const all = [...tag(ambList, "ambulance"), ...tag(hospList, "hospital")];

    let candidates: any[] = [];
    for (const radius of [50, 150]) {
      candidates = all.filter((p: any) => p._d <= radius);
      if (candidates.length > 0) break;
    }
    candidates = candidates
      .sort((a: any, b: any) => {
        if (isPublicCoverage) {
          const ap = String(a.ownership ?? "").toLowerCase() === "public" ? 0 : 1;
          const bp = String(b.ownership ?? "").toLowerCase() === "public" ? 0 : 1;
          if (ap !== bp) return ap - bp;
        }
        return a._d - b._d;
      })
      .slice(0, 20);

    // Fetch incident user for doctor notification
    const { data: incidentDetail } = await sb.from("holarchelp_incidents")
      .select("user_id, severity").eq("id", incident_id).maybeSingle();

    // Notify connected doctors regardless of ambulance candidates
    if (incidentDetail?.user_id) {
      const { data: access } = await sb.from("doctor_patient_access")
        .select("doctor_id")
        .eq("patient_user_id", incidentDetail.user_id)
        .eq("is_active", true);
      const doctorIds = Array.from(new Set((access ?? []).map((a: any) => a.doctor_id))).filter(Boolean);
      if (doctorIds.length) {
        const { data: pat } = await sb.from("profiles").select("full_name").eq("id", incidentDetail.user_id).maybeSingle();
        const patientName = (pat as any)?.full_name ?? "A patient";
        const sev = (incidentDetail as any).severity ?? "critical";
        const notifs = doctorIds.map((doctor_id: string) => ({
          user_id: doctor_id,
          type: "patient_incident",
          title: "Patient SOS triggered",
          description: `${patientName} has triggered an SOS (${sev}).`,
          reference_id: incident_id,
        }));
        await sb.from("notifications").insert(notifs as any).then(() => {}, () => {});
      }
    }

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ offered: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rows = candidates.map((p: any) => ({
      incident_id, provider_id: p.id, provider_kind: p._kind,
      response: "pending", distance_km: Number(p._d.toFixed(2)),
    }));
    const { error } = await sb.from("holarchelp_incident_offers").upsert(rows, {
      onConflict: "incident_id,provider_id", ignoreDuplicates: true,
    });
    if (error) throw error;

    return new Response(JSON.stringify({ offered: candidates.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
