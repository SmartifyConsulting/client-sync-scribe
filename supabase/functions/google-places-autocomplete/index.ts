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
    const input = typeof body?.input === "string" ? body.input.trim() : "";
    const requestedTypes = typeof body?.types === "string" ? body.types.trim() : "any";
    if (!input || input.length < 2) return j({ predictions: [] });
    if (input.length > 200) return j({ error: "input too long" }, 400);

    let includedPrimaryTypes: string[] | undefined;
    if (requestedTypes === "address") includedPrimaryTypes = ["street_address", "route", "premise"];
    else if (requestedTypes === "establishment") includedPrimaryTypes = ["establishment"];
    else if (requestedTypes === "(cities)") includedPrimaryTypes = ["locality", "administrative_area_level_3"];
    else if (requestedTypes === "(regions)") includedPrimaryTypes = ["administrative_area_level_1", "administrative_area_level_2", "country"];

    const reqBody: Record<string, unknown> = { input };
    if (includedPrimaryTypes) reqBody.includedPrimaryTypes = includedPrimaryTypes;

    const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY },
      body: JSON.stringify(reqBody),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Places (New) autocomplete error:", res.status, data);
      return j({
        predictions: [],
        status: data?.error?.status ?? "REQUEST_DENIED",
        error_message: data?.error?.message ?? `HTTP ${res.status}`,
      });
    }

    const predictions = (data?.suggestions ?? [])
      .map((s: any) => s.placePrediction)
      .filter(Boolean)
      .map((p: any) => ({
        description: p.text?.text ?? "",
        place_id: p.placeId,
      }));

    return j({ predictions, status: "OK" });
  } catch (error) {
    console.error("Places autocomplete error:", error);
    return j({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function j(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
