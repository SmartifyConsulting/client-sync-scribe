import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Radar, MapPin, Clock, Gauge, Route } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Ping = {
  id: string;
  provider_id: string;
  vehicle_id: string | null;
  user_id: string;
  crew_member_id: string | null;
  incident_id: string | null;
  lat: number;
  lng: number;
  speed_kph: number | null;
  heading: number | null;
  accuracy_m: number | null;
  recorded_at: string;
};

const STOP_SPEED_KPH = 3;
const STOP_MIN_SECONDS = 90;

function groupStops(pings: Ping[]) {
  // pings expected ascending by time
  const stops: { lat: number; lng: number; arrived: string; departed: string; seconds: number }[] = [];
  let cur: { lat: number; lng: number; arrived: string; departed: string; pts: number } | null = null;
  for (const p of pings) {
    const moving = (p.speed_kph ?? 0) > STOP_SPEED_KPH;
    if (!moving) {
      if (!cur) cur = { lat: p.lat, lng: p.lng, arrived: p.recorded_at, departed: p.recorded_at, pts: 1 };
      else { cur.departed = p.recorded_at; cur.pts += 1; }
    } else if (cur) {
      const sec = (new Date(cur.departed).getTime() - new Date(cur.arrived).getTime()) / 1000;
      if (sec >= STOP_MIN_SECONDS) stops.push({ ...cur, seconds: Math.round(sec) });
      cur = null;
    }
  }
  if (cur) {
    const sec = (new Date(cur.departed).getTime() - new Date(cur.arrived).getTime()) / 1000;
    if (sec >= STOP_MIN_SECONDS) stops.push({ ...cur, seconds: Math.round(sec) });
  }
  return stops;
}

function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function fmtDuration(sec: number) {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function TelematicsScreen() {
  const { providerId } = useProviderAccess();
  const [pings, setPings] = useState<Ping[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!providerId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("holarchelp_telematics_pings" as any)
        .select("*")
        .eq("provider_id", providerId)
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: true })
        .limit(5000);
      if (!mounted) return;
      const rows = (data ?? []) as unknown as Ping[];
      setPings(rows);
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,full_name")
          .in("id", ids);
        const map: Record<string, string> = {};
        (profs ?? []).forEach((p: any) => { map[p.id] = p.full_name ?? "Driver"; });
        if (mounted) setProfiles(map);
      }
      setLoading(false);
    })();
    const ch = supabase.channel(`telematics-${providerId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "holarchelp_telematics_pings", filter: `provider_id=eq.${providerId}` },
        (payload) => setPings((prev) => [...prev, payload.new as any]))
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [providerId]);

  const byDriver = useMemo(() => {
    const m = new Map<string, Ping[]>();
    for (const p of pings) {
      if (!m.has(p.user_id)) m.set(p.user_id, []);
      m.get(p.user_id)!.push(p);
    }
    return m;
  }, [pings]);

  const live = useMemo(() => {
    const arr: { userId: string; name: string; last: Ping; idleSec: number; moving: boolean }[] = [];
    byDriver.forEach((rows, userId) => {
      const last = rows[rows.length - 1];
      const idleSec = Math.round((Date.now() - new Date(last.recorded_at).getTime()) / 1000);
      arr.push({
        userId,
        name: profiles[userId] ?? "Driver",
        last,
        idleSec,
        moving: (last.speed_kph ?? 0) > STOP_SPEED_KPH,
      });
    });
    return arr.sort((a, b) => +new Date(b.last.recorded_at) - +new Date(a.last.recorded_at));
  }, [byDriver, profiles]);

  const trips = useMemo(() => {
    const out: {
      userId: string; name: string; pingsCount: number; first: string; last: string;
      distanceM: number; maxSpeed: number; stops: ReturnType<typeof groupStops>;
    }[] = [];
    byDriver.forEach((rows, userId) => {
      if (rows.length < 2) return;
      let dist = 0;
      let maxSpeed = 0;
      for (let i = 1; i < rows.length; i++) {
        dist += haversineM(rows[i - 1], rows[i]);
        maxSpeed = Math.max(maxSpeed, rows[i].speed_kph ?? 0);
      }
      out.push({
        userId,
        name: profiles[userId] ?? "Driver",
        pingsCount: rows.length,
        first: rows[0].recorded_at,
        last: rows[rows.length - 1].recorded_at,
        distanceM: dist,
        maxSpeed,
        stops: groupStops(rows),
      });
    });
    return out;
  }, [byDriver, profiles]);

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Fleet Telematics · Last 24h</p>
          <h1 className="flex items-center gap-2 text-xl font-extrabold"><Radar className="h-5 w-5 text-primary" /> Driver Tracking</h1>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {loading ? "Loading…" : `${pings.length.toLocaleString()} pings · ${byDriver.size} driver(s)`}
        </span>
      </header>

      <Tabs defaultValue="live" className="w-full">
        <TabsList>
          <TabsTrigger value="live">Live Fleet</TabsTrigger>
          <TabsTrigger value="trips">Trips & Stops</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-3">
          {live.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No active drivers in the last 24 hours.
            </p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {live.map((d) => (
                <div key={d.userId} className="rounded-xl border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{d.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${d.moving ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"}`}>
                      {d.moving ? "Moving" : "Stopped"}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {d.last.lat.toFixed(4)}, {d.last.lng.toFixed(4)}</span>
                    <span className="flex items-center gap-1"><Gauge className="h-3 w-3" /> {Math.round(d.last.speed_kph ?? 0)} km/h</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(d.last.recorded_at))} ago</span>
                    <span className="flex items-center gap-1"><Route className="h-3 w-3" /> {d.last.incident_id ? "On mission" : "Free roam"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trips" className="mt-3">
          {trips.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No trip data yet — start a shift to begin recording telematics.
            </p>
          ) : (
            <div className="space-y-3">
              {trips.map((t) => (
                <details key={t.userId} className="rounded-xl border bg-card">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-3 text-sm">
                    <span className="font-semibold">{t.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {(t.distanceM / 1000).toFixed(1)} km · max {Math.round(t.maxSpeed)} km/h · {t.stops.length} stop(s) · {t.pingsCount} pings
                    </span>
                  </summary>
                  <div className="border-t p-3 text-xs">
                    <p className="mb-2 text-muted-foreground">
                      First ping: {new Date(t.first).toLocaleString()} · Last ping: {new Date(t.last).toLocaleString()}
                    </p>
                    {t.stops.length === 0 ? (
                      <p className="text-muted-foreground">No qualifying stops (≥{STOP_MIN_SECONDS}s).</p>
                    ) : (
                      <table className="w-full text-left">
                        <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          <tr><th className="py-1">Arrived</th><th>Departed</th><th>Dwell</th><th>Location</th></tr>
                        </thead>
                        <tbody>
                          {t.stops.map((s, i) => (
                            <tr key={i} className="border-t">
                              <td className="py-1">{new Date(s.arrived).toLocaleTimeString()}</td>
                              <td>{new Date(s.departed).toLocaleTimeString()}</td>
                              <td>{fmtDuration(s.seconds)}</td>
                              <td className="text-muted-foreground">{s.lat.toFixed(4)}, {s.lng.toFixed(4)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
