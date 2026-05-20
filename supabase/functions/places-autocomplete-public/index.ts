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
    if (!KEY) return j({ error: "MAPBOX_PUBLIC_TOKEN is not configured" }, 500);

    const body = await req.json().catch(() => null);
    const input = typeof body?.input === "string" ? body.input.trim() : "";
    const sessionToken = typeof body?.session_token === "string" ? body.session_token : crypto.randomUUID();
    if (!input || input.length < 2) return j({ predictions: [], session_token: sessionToken });
    if (input.length > 200) return j({ error: "input too long" }, 400);

    const params = new URLSearchParams({
      q: input,
      session_token: sessionToken,
      access_token: KEY,
      limit: "8",
    });
    const res = await fetch(`https://api.mapbox.com/search/searchbox/v1/suggest?${params}`);
    const data = await res.json();
    if (!res.ok) {
      console.error("Mapbox suggest (public) error:", res.status, data);
      return j({ predictions: [], session_token: sessionToken });
    }
    const predictions = ((data?.suggestions ?? []) as any[]).map((s: any) => ({
      description: s.full_address ?? [s.name, s.place_formatted].filter(Boolean).join(", "),
      place_id: s.mapbox_id,
    }));
    return j({ predictions, status: "OK", session_token: sessionToken });
  } catch (e) {
    console.error("places-autocomplete-public error", e);
    return j({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function j(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
