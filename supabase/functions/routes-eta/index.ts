import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    const key = Deno.env.get("MAPBOX_PUBLIC_TOKEN");
    if (!key) return json({ error: "mapbox token not configured" }, 500);

    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coords}?geometries=polyline&overview=full&access_token=${key}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      return json({ fallback: true, reason: "mapbox_directions_failed", detail: txt }, 200);
    }
    const data = await resp.json();
    const route = data?.routes?.[0];
    if (!route) return json({ fallback: true, reason: "no_route" }, 200);

    const seconds = Math.round(route.duration ?? 0);
    return json({
      duration_seconds: seconds,
      duration_minutes: Math.max(1, Math.round(seconds / 60)),
      distance_meters: Math.round(route.distance ?? 0),
      polyline: route.geometry ?? null,
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
