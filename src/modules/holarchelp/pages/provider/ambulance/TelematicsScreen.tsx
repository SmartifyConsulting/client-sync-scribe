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
  const { t } = useTranslation();
  const [pings, setPings] = useState<Ping[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [crewNames, setCrewNames] = useState<Record<string, string>>({});
  const [vehicleLabels, setVehicleLabels] = useState<Record<string, string>>({});

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
        .limit(10000);
      if (!mounted) return;
      const rows = (data ?? []) as unknown as Ping[];
      setPings(rows);

      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
      const crewIds = Array.from(
        new Set(rows.map((r) => r.crew_member_id).filter(Boolean) as string[]),
      );
      const vehicleIds = Array.from(
        new Set(rows.map((r) => r.vehicle_id).filter(Boolean) as string[]),
      );

      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,full_name")
          .in("id", userIds);
        const map: Record<string, string> = {};
        (profs ?? []).forEach((p: any) => {
          map[p.id] = p.full_name ?? "Driver";
        });
        if (mounted) setProfiles(map);
      }
      if (crewIds.length) {
        const { data: crews } = await supabase
          .from("holarchelp_ambulance_members" as any)
          .select("id, invited_name, role")
          .in("id", crewIds);
        const cmap: Record<string, string> = {};
        ((crews ?? []) as any[]).forEach((c) => {
          cmap[c.id] = c.invited_name || c.role || "Crew";
        });
        if (mounted) setCrewNames(cmap);
      }
      if (vehicleIds.length) {
        const { data: vehs } = await supabase
          .from("ambulances" as any)
          .select("id, vehicle_code, registration_number")
          .in("id", vehicleIds);
        const vmap: Record<string, string> = {};
        ((vehs ?? []) as any[]).forEach((v) => {
          vmap[v.id] = v.vehicle_code || v.registration_number || "Unit";
        });
        if (mounted) setVehicleLabels(vmap);
      }
      setLoading(false);
    })();
    const ch = supabase
      .channel(`telematics-${providerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "holarchelp_telematics_pings",
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => setPings((prev) => [...prev, payload.new as any]),
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [providerId]);

  // Group key prefers crew_member_id (named seeded crew) else user_id (real signed-in drivers)
  const groupKey = (p: Ping) => p.crew_member_id || `u:${p.user_id}`;
  const driverLabel = (key: string, sample: Ping) => {
    if (sample.crew_member_id && crewNames[sample.crew_member_id])
      return crewNames[sample.crew_member_id];
    return profiles[sample.user_id] ?? t("telematics.driver");
  };

  const byDriver = useMemo(() => {
    const m = new Map<string, Ping[]>();
    for (const p of pings) {
      const k = groupKey(p);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    return m;
  }, [pings]);

  const live = useMemo(() => {
    const arr: {
      key: string; name: string; vehicle: string; last: Ping; idleSec: number; moving: boolean;
    }[] = [];
    byDriver.forEach((rows, key) => {
      const last = rows[rows.length - 1];
      const idleSec = Math.round((Date.now() - new Date(last.recorded_at).getTime()) / 1000);
      arr.push({
        key,
        name: driverLabel(key, last),
        vehicle: last.vehicle_id ? vehicleLabels[last.vehicle_id] ?? "" : "",
        last,
        idleSec,
        moving: (last.speed_kph ?? 0) > STOP_SPEED_KPH,
      });
    });
    return arr.sort((a, b) => +new Date(b.last.recorded_at) - +new Date(a.last.recorded_at));
  }, [byDriver, profiles, crewNames, vehicleLabels]);

  const trips = useMemo(() => {
    const out: {
      key: string; name: string; vehicle: string; pingsCount: number; first: string; last: string;
      distanceM: number; maxSpeed: number; stops: ReturnType<typeof groupStops>;
    }[] = [];
    byDriver.forEach((rows, key) => {
      if (rows.length < 2) return;
      let dist = 0;
      let maxSpeed = 0;
      for (let i = 1; i < rows.length; i++) {
        dist += haversineM(rows[i - 1], rows[i]);
        maxSpeed = Math.max(maxSpeed, rows[i].speed_kph ?? 0);
      }
      const last = rows[rows.length - 1];
      out.push({
        key,
        name: driverLabel(key, last),
        vehicle: last.vehicle_id ? vehicleLabels[last.vehicle_id] ?? "" : "",
        pingsCount: rows.length,
        first: rows[0].recorded_at,
        last: rows[rows.length - 1].recorded_at,
        distanceM: dist,
        maxSpeed,
        stops: groupStops(rows),
      });
    });
    return out.sort((a, b) => +new Date(b.last) - +new Date(a.last));
  }, [byDriver, profiles, crewNames, vehicleLabels]);

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-2">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {t("telematics.subtitle")}
          </p>
          <h1 className="flex items-center gap-2 text-xl font-extrabold">
            <Radar className="h-5 w-5 text-primary" /> {t("telematics.title")}
          </h1>
        </div>
        <span className="text-sm text-muted-foreground">
          {loading
            ? t("common.loading")
            : `${pings.length.toLocaleString()} ${t("telematics.pings")} Â· ${byDriver.size} ${t("telematics.drivers")}`}
        </span>
      </header>

      <Tabs defaultValue="live" className="w-full">
        <TabsList>
          <TabsTrigger value="live">{t("telematics.liveFleet")}</TabsTrigger>
          <TabsTrigger value="trips">{t("telematics.tripsStops")}</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-3">
          {live.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              {t("telematics.noActive")}
            </p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {live.map((d) => (
                <div key={d.key} className="rounded-xl border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{d.name}</p>
                      {d.vehicle && (
                        <p className="text-sm text-muted-foreground">
                          {t("telematics.vehicle")}: {d.vehicle}
                        </p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-sm font-bold uppercase tracking-wider ${
                        d.moving
                          ? "bg-emerald-500/15 text-emerald-700"
                          : "bg-warning/15 text-warning"
                      }`}
                    >
                      {d.moving ? t("telematics.moving") : t("telematics.stopped")}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {d.last.lat.toFixed(4)}, {d.last.lng.toFixed(4)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Gauge className="h-3 w-3" /> {Math.round(d.last.speed_kph ?? 0)} km/h
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(d.last.recorded_at))} ago
                    </span>
                    <span className="flex items-center gap-1">
                      <Route className="h-3 w-3" />{" "}
                      {d.last.incident_id ? t("telematics.onMission") : t("telematics.freeRoam")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trips" className="mt-3">
          {trips.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              {t("telematics.noTrips")}
            </p>
          ) : (
            <div className="space-y-3">
              {trips.map((tr) => (
                <details key={tr.key} className="rounded-xl border bg-card">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-3 text-sm">
                    <span className="font-semibold">
                      {tr.name}
                      {tr.vehicle && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          Â· {tr.vehicle}
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {(tr.distanceM / 1000).toFixed(1)} km Â· max {Math.round(tr.maxSpeed)} km/h Â·{" "}
                      {tr.stops.length} {tr.stops.length === 1 ? t("telematics.stop") : t("telematics.stops")} Â·{" "}
                      {tr.pingsCount} {t("telematics.pings")}
                    </span>
                  </summary>
                  <div className="border-t p-3 text-sm">
                    <p className="mb-2 text-muted-foreground">
                      {new Date(tr.first).toLocaleString()} â†’ {new Date(tr.last).toLocaleString()}
                    </p>
                    {tr.stops.length === 0 ? (
                      <p className="text-muted-foreground">
                        {t("telematics.noQualifyingStops")} (â‰¥{STOP_MIN_SECONDS}s).
                      </p>
                    ) : (
                      <table className="w-full text-left">
                        <thead className="text-sm uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="py-1">{t("telematics.arrived")}</th>
                            <th>{t("telematics.departed")}</th>
                            <th>{t("telematics.dwell")}</th>
                            <th>{t("telematics.location")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tr.stops.map((s, i) => (
                            <tr key={i} className="border-t">
                              <td className="py-1">{new Date(s.arrived).toLocaleTimeString()}</td>
                              <td>{new Date(s.departed).toLocaleTimeString()}</td>
                              <td>{fmtDuration(s.seconds)}</td>
                              <td className="text-muted-foreground">
                                {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                              </td>
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

