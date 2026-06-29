import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "unauthenticated" }, 401);
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userRes } = await supa.auth.getUser();
    if (!userRes?.user) return json({ error: "unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const origin = body?.origin;
    const destination = body?.destination;
    if (
      !origin || !destination ||
      typeof origin.lat !== "number" || typeof origin.lng !== "number" ||
      typeof destination.lat !== "number" || typeof destination.lng !== "number"
    ) {
      return json({ error: "origin and destination {lat,lng} required" }, 400);
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const gmapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!lovableKey || !gmapsKey) {
      return json({ fallback: true, reason: "google_maps_connector_not_configured" }, 200);
    }

    const resp = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gmapsKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      return json({ fallback: true, reason: "google_routes_failed", status: resp.status, detail: txt }, 200);
    }
    const data = await resp.json();
    const route = data?.routes?.[0];
    if (!route) return json({ fallback: true, reason: "no_route" }, 200);

    // route.duration is an ISO-8601 duration string like "423s"
    const durationStr = String(route.duration ?? "0s");
    const seconds = Number(durationStr.replace(/s$/, "")) || 0;
    return json({
      duration_seconds: seconds,
      duration_minutes: Math.max(1, Math.round(seconds / 60)),
      distance_meters: Math.round(route.distanceMeters ?? 0),
      polyline: route.polyline?.encodedPolyline ?? null,
    });
  } catch (e) {
    return json({ fallback: true, reason: String((e as Error).message ?? e) }, 200);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
