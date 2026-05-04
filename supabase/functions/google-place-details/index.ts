import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: ce } = await supabase.auth.getClaims(token);
    if (ce || !claims?.claims) return json({ error: "Unauthorized" }, 401);

    const KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!KEY) return json({ error: "GOOGLE_MAPS_API_KEY not configured" }, 500);

    const body = await req.json().catch(() => null);
    const placeId = typeof body?.place_id === "string" ? body.place_id.trim() : "";
    if (!placeId || placeId.length > 200) return json({ error: "invalid place_id" }, 400);

    const fields = [
      "name", "formatted_address", "geometry/location",
      "address_component", "international_phone_number", "website",
    ].join(",");
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const r = data?.result ?? {};
    const comps: any[] = r.address_components ?? [];
    const findComp = (type: string) =>
      comps.find((c: any) => Array.isArray(c.types) && c.types.includes(type));
    const city = findComp("locality")?.long_name
      ?? findComp("postal_town")?.long_name
      ?? findComp("administrative_area_level_2")?.long_name
      ?? null;
    const country = findComp("country")?.long_name ?? null;

    return json({
      name: r.name ?? null,
      formatted_address: r.formatted_address ?? null,
      lat: r.geometry?.location?.lat ?? null,
      lng: r.geometry?.location?.lng ?? null,
      city,
      country,
      phone: r.international_phone_number ?? null,
      website: r.website ?? null,
    });
  } catch (e) {
    console.error("place-details error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
