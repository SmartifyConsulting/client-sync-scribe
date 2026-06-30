import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Ambulance, Loader2 } from "lucide-react";
import { toast } from "sonner";


type Offer = {
  provider_id: string;
  provider_kind: "ambulance" | "hospital";
  response: "pending" | "accepted" | "superseded" | string;
  distance_km: number | null;
  name: string;
  ownership: string | null;
};

const AUTO_ASSIGN_MS = 30 * 1000;

function fmt(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function AvailableResponders({
  incidentId,
  createdAt,
  assignedProviderId = null,
  autoAssignedAt = null,
}: {
  incidentId: string;
  createdAt: string;
  assignedProviderId?: string | null;
  autoAssignedAt?: string | null;
}) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [picking, setPicking] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const isChangeMode = !!assignedProviderId && !!autoAssignedAt;

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.rpc("holarchelp_get_incident_offers" as any, { _incident_id: incidentId });
      if (error) { setOffers([]); return; }
      const merged: Offer[] = ((data as any[]) ?? [])
        // Patient SOS only ever calls an ER (ambulance) provider — the ER
        // provider then selects the receiving hospital.
        .filter((r) => r?.provider_kind === "ambulance")
        // Defensive: drop any row missing a real display name
        .filter((r) => r?.name && String(r.name).trim().length > 0)
        .map((r: any) => ({
          provider_id: r.provider_id,
          provider_kind: r.provider_kind,
          response: r.response,
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

  const deadline = new Date(isChangeMode && autoAssignedAt ? autoAssignedAt : createdAt).getTime() + AUTO_ASSIGN_MS;
  const remainingSec = Math.max(0, Math.floor((deadline - now) / 1000));

  useEffect(() => {
    if (isChangeMode || remainingSec > 0) return;
    if (!offers.length) return;
    supabase.rpc("holarchelp_auto_assign_incident" as any, { _incident_id: incidentId }).then(() => {}, () => {});
  }, [isChangeMode, remainingSec === 0, offers.length, incidentId]);

  const pick = async (o: Offer) => {
    setPicking(o.provider_id);
    const { error } = isChangeMode
      ? await supabase.rpc("holarchelp_patient_change_provider" as any, {
          _incident_id: incidentId,
          _provider_id: o.provider_id,
        })
      : await supabase.rpc("holarchelp_patient_pick_provider" as any, {
          _incident_id: incidentId,
          _provider_id: o.provider_id,
          _kind: o.provider_kind,
        });
    setPicking(null);
    if (error) return toast.error(error.message);
    toast.success(isChangeMode ? `ER Provider changed to ${o.name}` : `${o.name} assigned`);
  };

  if (isChangeMode && remainingSec <= 0) {
    return (
      <div className="mb-3 rounded-2xl border bg-card p-3 shadow-[var(--shadow-card)]">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ER Provider locked</p>
        <p className="mt-1 text-xs text-muted-foreground">
          The 30 second change window has closed. ER Dispatch can still reassign the case if operationally required.
        </p>
      </div>
    );
  }

  if (!offers.length) return null;

  return (
    <div className="mb-3 rounded-2xl border-2 border-primary/30 bg-card p-3 shadow-[var(--shadow-card)]">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">
          {isChangeMode ? "Change ER Provider" : `Available ER providers (${offers.length})`}
        </p>
        <p className="text-xs font-mono tabular-nums text-muted-foreground">
          {isChangeMode ? `Change window ${fmt(remainingSec)}` : `Auto-assign in ${fmt(remainingSec)}`}
        </p>
      </div>
      <ul className="space-y-2">
        {offers.map((o) => (
          <li key={o.provider_id} className="flex items-center gap-2 rounded-xl border bg-background p-2.5">
            <Ambulance className="h-5 w-5 shrink-0 text-red-600" />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{o.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {o.ownership ? <span className="capitalize">{o.ownership}</span> : null}
                {o.distance_km != null && <> · {Number(o.distance_km).toFixed(1)} km</>}
              </p>
            </div>
            <Button
              size="sm"
              className="h-8 shrink-0"
              variant={assignedProviderId === o.provider_id ? "secondary" : "default"}
              onClick={() => pick(o)}
              disabled={!!picking || assignedProviderId === o.provider_id}
            >
              {picking === o.provider_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : assignedProviderId === o.provider_id ? "Current" : isChangeMode ? "Change" : "Pick"}
            </Button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {isChangeMode
          ? `You can switch from the auto-assigned ER Provider for ${fmt(remainingSec)}.`
          : `Pick a responder, or we'll auto-assign the closest one in ${fmt(remainingSec)}.`}
      </p>
    </div>
  );
}
