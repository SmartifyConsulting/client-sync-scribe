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

const AUTO_ASSIGN_MS = 3 * 60 * 1000;

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
      const { data: rawOffers } = await supabase
        .from("holarchelp_incident_offers" as any)
        .select("provider_id, provider_kind, distance_km")
        .eq("incident_id", incidentId)
        .eq("response", "pending");
      const list = (rawOffers as any[]) ?? [];
      if (!list.length) { setOffers([]); return; }
      const ambIds = list.filter((o) => o.provider_kind === "ambulance").map((o) => o.provider_id);
      const hospIds = list.filter((o) => o.provider_kind === "hospital").map((o) => o.provider_id);
      const [ambRes, hospRes] = await Promise.all([
        ambIds.length
          ? supabase.from("holarchelp_ambulance_providers" as any).select("id, company_name, ownership").in("id", ambIds)
          : Promise.resolve({ data: [] as any[] }),
        hospIds.length
          ? supabase.from("holarchelp_hospitals" as any).select("id, name, ownership").in("id", hospIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const ambMap = new Map((ambRes.data ?? []).map((r: any) => [r.id, r]));
      const hospMap = new Map((hospRes.data ?? []).map((r: any) => [r.id, r]));
      const merged: Offer[] = list.map((o: any) => {
        if (o.provider_kind === "ambulance") {
          const r: any = ambMap.get(o.provider_id);
          return { ...o, name: r?.company_name ?? "Unknown ambulance", ownership: r?.ownership ?? null };
        }
        const r: any = hospMap.get(o.provider_id);
        return { ...o, name: r?.name ?? "Unknown hospital", ownership: r?.ownership ?? null };
      }).sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
      setOffers(merged);
    };
    load();
    const ch = supabase.channel(`avail-${incidentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incident_offers", filter: `incident_id=eq.${incidentId}` }, load)
      .subscribe();
    const t = setInterval(load, 8000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [incidentId]);

  // countdown + auto-assign trigger
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
                {o.distance_km != null && <> · {o.distance_km.toFixed(1)} km</>}
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
