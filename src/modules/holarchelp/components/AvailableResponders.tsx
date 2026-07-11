import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Ambulance, Loader2, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/userMessage";


type Offer = {
  provider_id: string;
  provider_kind: "ambulance" | "hospital";
  response: "pending" | "accepted" | "superseded" | string;
  distance_km: number | null;
  name: string;
  ownership: string | null;
};

const DISABLE_SELECTION_TIMER = false;
const AUTO_ASSIGN_MS = DISABLE_SELECTION_TIMER ? Number.MAX_SAFE_INTEGER : 30 * 1000;
const EXTEND_STEP_MS = 30 * 1000;
const EXTEND_MAX_MS = 60 * 1000; // up to two extensions

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
  const [extensionMs, setExtensionMs] = useState(0);
  const isChangeMode = !!assignedProviderId && !!autoAssignedAt;

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.rpc("holarchelp_get_incident_offers" as any, { _incident_id: incidentId });
      if (error) { setOffers([]); return; }
      const merged: Offer[] = ((data as any[]) ?? [])
        .filter((r) => r?.provider_kind === "ambulance")
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

  const baseTime = new Date(isChangeMode && autoAssignedAt ? autoAssignedAt : createdAt).getTime();
  const deadline = baseTime + AUTO_ASSIGN_MS + extensionMs;
  const remainingSec = Math.max(0, Math.floor((deadline - now) / 1000));
  const canExtend = remainingSec > 0 && extensionMs < EXTEND_MAX_MS;

  useEffect(() => {
    if (DISABLE_SELECTION_TIMER) return;
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
    if (error) {
      return toastError(
        error,
        isChangeMode
          ? "We couldn't switch ER Providers. Please try again."
          : "We couldn't assign that ER Provider. Please try again.",
      );
    }
    toast.success(isChangeMode ? `ER Provider changed to ${o.name}` : `${o.name} assigned`);
  };

  if (isChangeMode && remainingSec <= 0) {
    return (
      <div className="mb-3 rounded-2xl border bg-card p-3 shadow-[var(--shadow-card)]">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ER Provider locked in</p>
        <p className="mt-1 text-xs text-muted-foreground">
          The change window has closed. ER Dispatch can still reassign your case if needed.
        </p>
      </div>
    );
  }

  if (!offers.length) {
    if (isChangeMode) {
      return (
        <div className="mb-3 rounded-2xl border-2 border-amber-500/70 bg-amber-50/70 p-3 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          <p className="font-bold uppercase tracking-wider">Change ER Provider — {fmt(remainingSec)} left</p>
          <p className="mt-1">No other ER Providers are in range right now. Your current responder will continue.</p>
        </div>
      );
    }
    return (
      <div className="mb-3 rounded-2xl border-2 border-primary/30 bg-card p-3 shadow-[var(--shadow-card)]">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            Available ER providers (0)
          </p>
          <p className="flex items-center gap-1 text-xs font-mono tabular-nums text-muted-foreground">
            <Clock className="h-3 w-3" /> Auto-assign in {fmt(remainingSec)}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Searching for nearby ER Providers…</span>
        </div>
        {canExtend && (
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-sm"
              onClick={() => setExtensionMs((e) => Math.min(EXTEND_MAX_MS, e + EXTEND_STEP_MS))}
            >
              +30s more time
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Pin the current provider to the top in change mode
  const sorted = isChangeMode
    ? [...offers].sort((a, b) => {
        if (a.provider_id === assignedProviderId) return -1;
        if (b.provider_id === assignedProviderId) return 1;
        return 0;
      })
    : offers;

  return (
    <div
      className={
        isChangeMode
          ? "mb-3 rounded-2xl border-2 border-amber-500/70 bg-amber-50/70 dark:bg-amber-500/10 p-3 shadow-[var(--shadow-card)]"
          : "mb-3 rounded-2xl border-2 border-primary/30 bg-card p-3 shadow-[var(--shadow-card)]"
      }
    >
      {isChangeMode ? (
        <div className="mb-2 flex items-start gap-2 rounded-xl bg-amber-500/15 p-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
              An ER Provider was auto-assigned — you have {fmt(remainingSec)} to switch
            </p>
            <p className="text-sm text-amber-900/80 dark:text-amber-100/80">
              Tap another provider below to switch, or do nothing to keep the current one.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            Available ER providers ({offers.length})
          </p>
          <p className="flex items-center gap-1 text-xs font-mono tabular-nums text-muted-foreground">
            <Clock className="h-3 w-3" /> Auto-assign in {fmt(remainingSec)}
          </p>
        </div>
      )}

      {/* Countdown + extend control */}
      <div className="mb-2 flex items-center justify-between gap-2">
        {isChangeMode ? (
          <p className="flex items-center gap-1 text-xs font-mono tabular-nums text-amber-900 dark:text-amber-100">
            <Clock className="h-3 w-3" /> Change window {fmt(remainingSec)}
          </p>
        ) : <span />}
        {canExtend && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-sm"
            onClick={() => setExtensionMs((e) => Math.min(EXTEND_MAX_MS, e + EXTEND_STEP_MS))}
          >
            +30s more time
          </Button>
        )}
      </div>

      <ul className="space-y-2">
        {sorted.map((o) => {
          const isCurrent = assignedProviderId === o.provider_id;
          return (
            <li
              key={o.provider_id}
              className={
                isCurrent && isChangeMode
                  ? "flex items-center gap-2 rounded-xl border-2 border-primary bg-background p-2.5"
                  : "flex items-center gap-2 rounded-xl border bg-background p-2.5"
              }
            >
              <Ambulance className="h-5 w-5 shrink-0 text-red-600" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-semibold">{o.name}</p>
                  {isCurrent && isChangeMode && (
                    <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {o.ownership ? <span className="capitalize">{o.ownership}</span> : null}
                  {o.distance_km != null && <> · {Number(o.distance_km).toFixed(1)} km</>}
                </p>
              </div>
              <Button
                size="sm"
                className="h-8 shrink-0"
                variant={isCurrent ? "secondary" : isChangeMode ? "default" : "default"}
                onClick={() => pick(o)}
                disabled={!!picking || isCurrent}
              >
                {picking === o.provider_id
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : isCurrent
                  ? "Keep"
                  : isChangeMode
                  ? "Switch"
                  : "Pick"}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
