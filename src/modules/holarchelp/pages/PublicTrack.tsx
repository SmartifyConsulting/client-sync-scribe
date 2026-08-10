import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LiveMap } from "../components/LiveMap";
import { Heart } from "lucide-react";

type Incident = { id: string; status: string; created_at: string; resolved_at: string | null; full_name: string | null };
type Loc = { latitude: number; longitude: number; recorded_at: string };

const formatAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

export default function PublicTrack() {
  const { token } = useParams<{ token: string }>();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [, force] = useState(0);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 10000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    if (!token) return;
    const { data: inc } = await supabase.rpc("holarchelp_get_tracking_incident" as any, { _token: token });
    if (!inc || (inc as any).length === 0) { setNotFound(true); return; }
    setIncident((inc as any)[0]);
    const { data: locs } = await supabase.rpc("holarchelp_get_tracking_locations" as any, { _token: token, _limit: 200 });
    setLocations((locs as any) ?? []);
  };

  useEffect(() => { load(); const t = setInterval(load, 7000); return () => clearInterval(t); }, [token]);

  if (notFound) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-6 text-center">
        <Heart className="h-8 w-8 fill-primary text-primary" />
        <p className="mt-6 text-lg font-semibold">Tracking link not found</p>
        <p className="text-sm text-muted-foreground">This link may have expired.</p>
      </div>
    );
  }

  if (!incident) return <div className="flex min-h-dvh items-center justify-center text-muted-foreground">Loading live tracking…</div>;

  const latest = locations[0];

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b px-5 py-3 flex items-center gap-2">
        <Heart className="h-5 w-5 fill-primary text-primary" />
        <span className="font-extrabold"><span className="text-primary">Holarc</span><span className="text-sos">Help</span></span>
      </header>
      <div className="mx-auto max-w-2xl px-5 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{incident.full_name ?? "Someone"} needs help</h1>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${incident.status === "active" ? "bg-sos/10 text-sos" : "bg-secondary text-primary"}`}>
            {incident.status.toUpperCase()}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Started {new Date(incident.created_at).toLocaleString()}
          {latest && <> · Last update <strong>{formatAgo(latest.recorded_at)}</strong> · refreshing every 7s</>}
        </p>
        {latest && (
          <p className="mt-3 text-sm font-medium">
            Last position: {latest.latitude.toFixed(5)}, {latest.longitude.toFixed(5)}
          </p>
        )}
        <div className="mt-3"><LiveMap points={locations.slice(0, 1).map((l) => ({ kind: "patient" as const, latitude: l.latitude, longitude: l.longitude }))} height={460} /></div>
        {latest && (
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              className="rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
              href={`https://maps.google.com/?q=${latest.latitude},${latest.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Google Maps
            </a>
            <a
              className="rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
              href={`https://maps.apple.com/?ll=${latest.latitude},${latest.longitude}&q=Live%20location`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Apple Maps
            </a>
            <button
              type="button"
              className="rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
              onClick={() => navigator.clipboard?.writeText(`${latest.latitude}, ${latest.longitude}`)}
            >
              Copy coordinates
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
