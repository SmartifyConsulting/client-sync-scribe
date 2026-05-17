import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth.startsWith('Bearer ')) {
      return json({ error: 'unauthenticated' }, 401);
    }
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userRes } = await supa.auth.getUser();
    if (!userRes?.user) return json({ error: 'unauthenticated' }, 401);

    const body = await req.json().catch(() => ({}));
    const origin = body?.origin;
    const destination = body?.destination;
    if (
      !origin || !destination ||
      typeof origin.lat !== 'number' || typeof origin.lng !== 'number' ||
      typeof destination.lat !== 'number' || typeof destination.lng !== 'number'
    ) {
      return json({ error: 'origin and destination {lat,lng} required' }, 400);
    }

    const key = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!key) return json({ error: 'maps key not configured' }, 500);

    const resp = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: { location: { latLng: origin } },
        destination: { location: { latLng: destination } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      }),
    });

    if (!resp.ok) {
      // Return a safe fallback so the client falls back to straight-line ETA instead of breaking the map
      const txt = await resp.text().catch(() => '');
      return json({ fallback: true, reason: 'routes_api_failed', detail: txt }, 200);
    }
    const data = await resp.json();
    const route = data?.routes?.[0];
    if (!route) return json({ fallback: true, reason: 'no_route' }, 200);

    const seconds = parseInt(String(route.duration ?? '0').replace('s', '')) || 0;
    return json({
      duration_seconds: seconds,
      duration_minutes: Math.max(1, Math.round(seconds / 60)),
      distance_meters: route.distanceMeters ?? 0,
      polyline: route.polyline?.encodedPolyline ?? null,
    });
  } catch (e) {
    return json({ fallback: true, reason: String((e as Error).message ?? e) }, 200);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
