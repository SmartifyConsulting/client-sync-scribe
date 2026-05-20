import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// NOTE: Function name kept as 'google-places-autocomplete' for backwards
// compatibility, but it now proxies Mapbox Search Box /suggest.

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
    const input = typeof body?.input === "string" ? body.input.trim() : "";
    const requestedTypes = typeof body?.types === "string" ? body.types.trim() : "any";
    const sessionToken = typeof body?.session_token === "string" ? body.session_token : crypto.randomUUID();
    if (!input || input.length < 2) return j({ predictions: [], session_token: sessionToken });
    if (input.length > 200) return j({ error: "input too long" }, 400);

    let types: string | undefined;
    if (requestedTypes === "address") types = "address,street";
    else if (requestedTypes === "establishment") types = "poi";
    else if (requestedTypes === "(cities)") types = "place,locality";
    else if (requestedTypes === "(regions)") types = "region,district,country";

    const params = new URLSearchParams({
      q: input,
      session_token: sessionToken,
      access_token: KEY,
      limit: "8",
    });
    if (types) params.set("types", types);

    const res = await fetch(`https://api.mapbox.com/search/searchbox/v1/suggest?${params}`);
    const data = await res.json();
    if (!res.ok) {
      console.error("Mapbox suggest error:", res.status, data);
      return j({
        predictions: [],
        status: "REQUEST_DENIED",
        error_message: data?.message ?? `HTTP ${res.status}`,
        session_token: sessionToken,
      });
    }

    const predictions = ((data?.suggestions ?? []) as any[]).map((s: any) => ({
      description: s.full_address ?? [s.name, s.place_formatted].filter(Boolean).join(", "),
      place_id: s.mapbox_id,
    }));

    return j({ predictions, status: "OK", session_token: sessionToken });
  } catch (error) {
    console.error("Mapbox autocomplete error:", error);
    return j({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function j(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
