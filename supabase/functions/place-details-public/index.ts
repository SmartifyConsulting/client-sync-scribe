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

    const KEY = Deno.env.get("MAPBOX_PUBLIC_TOKEN");
    if (!KEY) return j({ error: "MAPBOX_PUBLIC_TOKEN not configured" }, 500);

    const body = await req.json().catch(() => null);
    const placeId = typeof body?.place_id === "string" ? body.place_id.trim() : "";
    const sessionToken = typeof body?.session_token === "string" ? body.session_token : crypto.randomUUID();
    if (!placeId || placeId.length > 200) return j({ error: "invalid place_id" }, 400);

    const res = await fetch(
      `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(placeId)}?session_token=${encodeURIComponent(sessionToken)}&access_token=${KEY}`,
    );
    const data = await res.json();
    const feat = data?.features?.[0];
    if (!res.ok || !feat) {
      console.error("Mapbox retrieve (public) error:", res.status, data);
      return j({ error: data?.message ?? `HTTP ${res.status}` }, 500);
    }
    const props = feat.properties ?? {};
    const ctx = props.context ?? {};
    const [lng, lat] = feat.geometry?.coordinates ?? [];
    return j({
      name: props.name ?? null,
      formatted_address: props.full_address ?? props.place_formatted ?? null,
      lat,
      lng,
      city: ctx.place?.name ?? ctx.locality?.name ?? null,
      country: ctx.country?.name ?? null,
      phone: props.metadata?.phone ?? null,
      website: props.metadata?.website ?? null,
    });
  } catch (e) {
    console.error("place-details-public error", e);
    return j({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function j(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
