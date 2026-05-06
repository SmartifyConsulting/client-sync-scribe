import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RL = new Map<string, { c: number; t: number }>();
function rateLimited(ip: string) {
  const now = Date.now();
  const entry = RL.get(ip);
  if (!entry || now - entry.t > 60_000) { RL.set(ip, { c: 1, t: now }); return false; }
  entry.c++;
  return entry.c > 60;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (rateLimited(ip)) return j({ error: "Too many requests" }, 429);

    const KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!KEY) return j({ error: "GOOGLE_MAPS_API_KEY not configured" }, 500);

    const body = await req.json().catch(() => null);
    const placeId = typeof body?.place_id === "string" ? body.place_id.trim() : "";
    if (!placeId || placeId.length > 200) return j({ error: "invalid place_id" }, 400);

    const fieldMask = ["id", "displayName", "formattedAddress", "location", "addressComponents", "internationalPhoneNumber", "websiteUri"].join(",");
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      method: "GET",
      headers: { "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": fieldMask },
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Place details (public) error:", res.status, data);
      return j({ error: data?.error?.message ?? `HTTP ${res.status}` }, 500);
    }
    const comps: any[] = data.addressComponents ?? [];
    const findComp = (type: string) => comps.find((c: any) => Array.isArray(c.types) && c.types.includes(type));
    const city = findComp("locality")?.longText ?? findComp("postal_town")?.longText ?? findComp("administrative_area_level_2")?.longText ?? null;
    const country = findComp("country")?.longText ?? null;
    return j({
      name: data.displayName?.text ?? null,
      formatted_address: data.formattedAddress ?? null,
      lat: data.location?.latitude ?? null,
      lng: data.location?.longitude ?? null,
      city,
      country,
      phone: data.internationalPhoneNumber ?? null,
      website: data.websiteUri ?? null,
    });
  } catch (e) {
    console.error("place-details-public error", e);
    return j({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function j(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
