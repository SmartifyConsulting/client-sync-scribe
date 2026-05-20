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

    const KEY = Deno.env.get("MAPBOX_PUBLIC_TOKEN");
    if (!KEY) return j({ error: "MAPBOX_PUBLIC_TOKEN is not configured" }, 500);

    const body = await req.json().catch(() => null);
    const mapboxId = typeof body?.mapbox_id === "string" ? body.mapbox_id.trim() : "";
    const placeId = typeof body?.place_id === "string" ? body.place_id.trim() : "";
    const address = typeof body?.address === "string" ? body.address.trim() : "";
    const sessionToken = typeof body?.session_token === "string" ? body.session_token : crypto.randomUUID();
    const id = mapboxId || placeId;
    if (!id && !address) return j({ error: "mapbox_id or address required" }, 400);
    if (address.length > 500) return j({ error: "address too long" }, 400);

    if (id) {
      const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(id)}?session_token=${encodeURIComponent(sessionToken)}&access_token=${KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      const feat = data?.features?.[0];
      if (!res.ok || !feat) {
        console.error("Mapbox retrieve error:", res.status, data);
        return j({ error: data?.message ?? `HTTP ${res.status}` }, 502);
      }
      const [lng, lat] = feat.geometry?.coordinates ?? [];
      return j({
        latitude: lat,
        longitude: lng,
        formatted_address: feat.properties?.full_address ?? feat.properties?.place_formatted ?? address,
      });
    }

    const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(address)}&limit=1&access_token=${KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const feat = data?.features?.[0];
    if (!res.ok || !feat) {
      console.error("Mapbox geocode error:", res.status, data);
      return j({ error: data?.message ?? `HTTP ${res.status}` }, 502);
    }
    const [lng, lat] = feat.geometry?.coordinates ?? [];
    return j({
      latitude: lat,
      longitude: lng,
      formatted_address: feat.properties?.full_address ?? feat.properties?.place_formatted ?? address,
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
