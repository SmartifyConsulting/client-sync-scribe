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
    if (!KEY) return j({ error: "GOOGLE_MAPS_API_KEY is not configured" }, 500);

    const body = await req.json().catch(() => null);
    const input = typeof body?.input === "string" ? body.input.trim() : "";
    if (!input || input.length < 2) return j({ predictions: [] });
    if (input.length > 200) return j({ error: "input too long" }, 400);

    const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY },
      body: JSON.stringify({ input }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Places autocomplete (public) error:", res.status, data);
      return j({ predictions: [] });
    }
    const predictions = (data?.suggestions ?? [])
      .map((s: any) => s.placePrediction)
      .filter(Boolean)
      .map((p: any) => ({ description: p.text?.text ?? "", place_id: p.placeId }));
    return j({ predictions, status: "OK" });
  } catch (e) {
    console.error("places-autocomplete-public error", e);
    return j({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function j(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
