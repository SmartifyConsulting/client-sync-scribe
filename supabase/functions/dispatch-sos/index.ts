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

    let q = sb.from("holarchelp_ambulance_providers")
      .select("id, latitude, longitude, ownership, accepting_patients, subscription_status, status")
      .eq("status", "approved")
      .eq("accepting_patients", true)
      .not("latitude", "is", null).not("longitude", "is", null);
    const { data: providers } = await q;

    const isPublicOnly = (incident as any).coverage === "public";
    const candidates = (providers ?? [])
      .filter((p: any) => !isPublicOnly || String(p.ownership ?? "").toLowerCase() === "public")
      .filter((p: any) => !exclude_provider_ids.includes(p.id))
      .map((p: any) => ({ ...p, _d: distKm(center, { lat: p.latitude, lng: p.longitude }) }))
      .filter((p: any) => p._d <= 50)
      .sort((a: any, b: any) => a._d - b._d)
      .slice(0, 15);

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ offered: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rows = candidates.map((p: any) => ({
      incident_id, provider_id: p.id, response: "pending", distance_km: Number(p._d.toFixed(2)),
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
