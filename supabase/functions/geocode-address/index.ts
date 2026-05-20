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
    if (!authHeader?.startsWith("Bearer ")) return j({ error: "Unauthorized" }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: ce } = await supabase.auth.getClaims(token);
    if (ce || !claims?.claims) return j({ error: "Unauthorized" }, 401);

    const KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!KEY) return j({ error: "GOOGLE_MAPS_API_KEY is not configured" }, 500);

    const body = await req.json().catch(() => null);
    const placeId = typeof body?.place_id === "string" ? body.place_id.trim() : "";
    const address = typeof body?.address === "string" ? body.address.trim() : "";
    if (!placeId && !address) return j({ error: "place_id or address required" }, 400);
    if (address.length > 500) return j({ error: "address too long" }, 400);

    // Prefer Places API (New) place details for place_id; fall back to Geocoding for raw address.
    if (placeId) {
      const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
        headers: {
          "X-Goog-Api-Key": KEY,
          "X-Goog-FieldMask": "id,location,formattedAddress",
        },
      });
      const data = await res.json();
      if (!res.ok || !data?.location) {
        console.error("Place details error:", res.status, data);
        return j({ error: data?.error?.message ?? `HTTP ${res.status}` }, 502);
      }
      return j({
        latitude: data.location.latitude,
        longitude: data.location.longitude,
        formatted_address: data.formattedAddress ?? address,
      });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || data?.status !== "OK" || !data?.results?.[0]) {
      console.error("Geocoding error:", res.status, data);
      return j({ error: data?.error_message ?? data?.status ?? `HTTP ${res.status}` }, 502);
    }
    const top = data.results[0];
    return j({
      latitude: top.geometry?.location?.lat,
      longitude: top.geometry?.location?.lng,
      formatted_address: top.formatted_address ?? address,
    });
  } catch (error) {
    console.error("Geocode error:", error);
    return j({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function j(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
