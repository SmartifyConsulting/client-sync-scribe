import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Ambulance, Hospital, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Offer = {
  provider_id: string;
  provider_kind: "ambulance" | "hospital";
  distance_km: number | null;
  name: string;
  ownership: string | null;
};

const AUTO_ASSIGN_MS = 60 * 1000;

function fmt(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function AvailableResponders({ incidentId, createdAt }: { incidentId: string; createdAt: string }) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [picking, setPicking] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.rpc("holarchelp_get_incident_offers" as any, { _incident_id: incidentId });
      if (error) { setOffers([]); return; }
      const merged: Offer[] = ((data as any[]) ?? [])
        // Defensive: drop any row missing a real display name
        .filter((r) => r?.name && String(r.name).trim().length > 0)
        .map((r: any) => ({
          provider_id: r.provider_id,
          provider_kind: r.provider_kind,
          distance_km: r.distance_km,
          name: r.name,
          ownership: r.ownership ?? null,
        }))
        .sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
      setOffers(merged);
    };
    load();
    const ch = supabase.channel(`avail-${incidentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incident_offers", filter: `incident_id=eq.${incidentId}` }, load)
      .subscribe();
    const t = setInterval(load, 8000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [incidentId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const deadline = new Date(createdAt).getTime() + AUTO_ASSIGN_MS;
  const remainingSec = Math.max(0, Math.floor((deadline - now) / 1000));

  useEffect(() => {
    if (remainingSec > 0) return;
    if (!offers.length) return;
    supabase.rpc("holarchelp_auto_assign_incident" as any, { _incident_id: incidentId }).then(() => {}, () => {});
  }, [remainingSec === 0, offers.length, incidentId]);

  const pick = async (o: Offer) => {
    setPicking(o.provider_id);
    const { error } = await supabase.rpc("holarchelp_patient_pick_provider" as any, {
      _incident_id: incidentId, _provider_id: o.provider_id, _kind: o.provider_kind,
    });
    setPicking(null);
    if (error) return toast.error(error.message);
    toast.success(`${o.name} assigned`);
  };

  if (!offers.length) return null;

  return (
    <div className="mb-3 rounded-2xl border-2 border-primary/30 bg-card p-3 shadow-[var(--shadow-card)]">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Available responders ({offers.length})</p>
        <p className="text-xs font-mono tabular-nums text-muted-foreground">Auto-assign in {fmt(remainingSec)}</p>
      </div>
      <ul className="space-y-2">
        {offers.map((o) => (
          <li key={o.provider_id} className="flex items-center gap-2 rounded-xl border bg-background p-2.5">
            {o.provider_kind === "ambulance"
              ? <Ambulance className="h-5 w-5 shrink-0 text-red-600" />
              : <Hospital className="h-5 w-5 shrink-0 text-blue-600" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{o.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {o.ownership ? <span className="capitalize">{o.ownership}</span> : null}
                {o.distance_km != null && <> · {Number(o.distance_km).toFixed(1)} km</>}
              </p>
            </div>
            <Button size="sm" className="h-8 shrink-0" onClick={() => pick(o)} disabled={!!picking}>
              {picking === o.provider_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Pick"}
            </Button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Pick a responder, or we'll auto-assign the closest one in {fmt(remainingSec)}.
      </p>
    </div>
  );
}
