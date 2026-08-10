import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, ChevronRight, HeartPulse, MapPin, Siren, Activity, Clock, Ambulance } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type Incident = {
  id: string;
  status: string;
  severity: string | null;
  ai_emergency_summary: string | null;
  conscious: boolean | null;
  breathing: boolean | null;
  created_at: string;
  assigned_ambulance_id: string | null;
  provider_latitude: number | null;
  provider_longitude: number | null;
  eta_minutes: number | null;
  tracking_token: string;
};

const ACTIVE = ["open", "reopened", "assigned", "en_route", "arrived", "patient_collected", "en_route_to_hospital", "at_hospital"];

const sevTone = (s: string | null) =>
  s === "critical"
    ? "bg-destructive/15 text-destructive border-destructive/40"
    : s === "high"
    ? "bg-warning/15 text-warning border-warning/40"
    : s === "moderate"
    ? "bg-warning/10 text-warning border-warning/40"
    : "bg-muted text-muted-foreground border-border";

const ago = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const CHIME =
  "data:audio/wav;base64,UklGRkAAAABXQVZFZm10IBAAAAABAAEARKwAAESsAAABAAgAZGF0YRwAAACAgICAgICAgICAgICAgICAgICAgICAgICAgIA=";

export default function LiveSOSScreen() {
  const { t } = useTranslation();
  const { providerId } = useProviderAccess();
  const [rows, setRows] = useState<Incident[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(() => localStorage.getItem("sos_muted") !== "0");
  const [ambMap, setAmbMap] = useState<Record<string, string>>({});

  const load = async () => {
    if (!providerId) return;
    const { data } = await supabase
      .from("holarchelp_incidents" as any)
      .select("*")
      .eq("assigned_provider_id", providerId)
      .order("created_at", { ascending: false })
      .limit(60);
    const list = ((data as any) ?? []) as Incident[];
    setRows(list);
    if (!selectedId && list.length) setSelectedId(list[0].id);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("live-sos-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "holarchelp_incidents" },
        (payload: any) => {
          if (payload?.eventType === "INSERT" && !muted) {
            try {
              new Audio(CHIME).play().catch(() => {});
            } catch {}
          }
          load();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  useEffect(() => {
    (async () => {
      if (!providerId) return;
      const { data } = await supabase.from("ambulances").select("id, vehicle_code").eq("provider_id", providerId);
      const m: Record<string, string> = {};
      (data ?? []).forEach((a: any) => (m[a.id] = a.vehicle_code));
      setAmbMap(m);
    })();
  }, [providerId]);

  useEffect(() => {
    localStorage.setItem("sos_muted", muted ? "1" : "0");
  }, [muted]);

  const active = useMemo(() => rows.filter((r) => ACTIVE.includes(r.status)), [rows]);
  const recent = useMemo(() => rows.filter((r) => !ACTIVE.includes(r.status)).slice(0, 20), [rows]);
  const selected = rows.find((r) => r.id === selectedId);
  const criticalCount = active.filter((r) => r.severity === "critical").length;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", criticalCount > 0 ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-destructive/10 text-destructive")}>
            <HeartPulse className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground leading-tight">{t("liveSos.title")}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <KPI icon={Siren} label={t("liveSos.active")} value={active.length} tone="text-destructive" />
          <KPI icon={Activity} label={t("liveSos.critical")} value={criticalCount} tone="text-destructive" />
          <KPI icon={Clock} label={t("liveSos.recent")} value={recent.length} tone="text-muted-foreground" />
          <Button variant="outline" size="sm" onClick={() => setMuted((m) => !m)} className="h-9">
            {muted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            <span className="ml-1.5 text-xs">{muted ? t("liveSos.muted") : t("liveSos.alertsOn")}</span>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        {/* List */}
        <div className="space-y-2">
          <SectionLabel count={active.length}>{t("liveSos.activeNow")}</SectionLabel>
          {active.length === 0 && <EmptyRow>{t("liveSos.allClear")}</EmptyRow>}
          {active.map((r) => (
            <IncidentRow
              key={r.id}
              i={r}
              ambCode={r.assigned_ambulance_id ? ambMap[r.assigned_ambulance_id] : undefined}
              selected={selectedId === r.id}
              onClick={() => setSelectedId(r.id)}
            />
          ))}

          {recent.length > 0 && (
            <>
              <SectionLabel count={recent.length}>{t("liveSos.recent")}</SectionLabel>
              {recent.map((r) => (
                <IncidentRow
                  key={r.id}
                  i={r}
                  ambCode={r.assigned_ambulance_id ? ambMap[r.assigned_ambulance_id] : undefined}
                  selected={selectedId === r.id}
                  onClick={() => setSelectedId(r.id)}
                  dim
                />
              ))}
            </>
          )}
        </div>

        {/* Detail */}
        <aside className="rounded-2xl border bg-card p-4">
          {!selected && (
            <p className="text-sm text-muted-foreground">{t("liveSos.selectIncident")}</p>
          )}
          {selected && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={cn("inline-block rounded-full border px-2 py-0.5 text-xs font-bold uppercase", sevTone(selected.severity))}>
                    {selected.severity ?? "—"}
                  </span>
                  <h2 className="mt-2 text-lg font-bold leading-tight">{selected.ai_emergency_summary ?? t("liveSos.sosIncident")}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    #{selected.tracking_token} · {ago(selected.created_at)} · {selected.status.replace(/_/g, " ")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <Stat label={t("liveSos.consciousness")} value={selected.conscious === false ? t("ambulance.unconscious") : t("liveSos.responsive")} bad={selected.conscious === false} />
                <Stat label={t("incomingSos.breathing")} value={selected.breathing === false ? t("ambulance.notBreathing") : t("liveSos.adequate")} bad={selected.breathing === false} />
                <Stat label={t("liveSos.ambulance")} value={selected.assigned_ambulance_id ? ambMap[selected.assigned_ambulance_id] ?? t("status.assigned") : t("status.unassigned")} icon={Ambulance} />
                <Stat label={t("liveSos.eta")} value={selected.eta_minutes ? `${selected.eta_minutes} min` : "—"} icon={Clock} />
              </div>

              {selected.provider_latitude != null && selected.provider_longitude != null && (
                <div className="rounded-xl border bg-muted/40 p-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {t("liveSos.location")}
                  </p>
                  <p className="mt-1 text-xs font-mono">
                    {selected.provider_latitude.toFixed(4)}, {selected.provider_longitude.toFixed(4)}
                  </p>
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://www.google.com/maps?q=${selected.provider_latitude},${selected.provider_longitude}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    {t("liveSos.openInMaps")} <ChevronRight className="h-3 w-3" />
                  </a>
                </div>
              )}

              <Link
                to={`/provider/ambulance/incident/${selected.id}`}
                className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                {t("liveSos.openConsole")} <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function IncidentRow({
  i,
  ambCode,
  selected,
  onClick,
  dim,
}: {
  i: Incident;
  ambCode?: string;
  selected: boolean;
  onClick: () => void;
  dim?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border bg-card p-3 text-left transition hover:border-primary/50",
        selected && "border-primary ring-2 ring-primary/20",
        dim && "opacity-70"
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cn("mt-0.5 inline-block rounded-full border px-1.5 py-0.5 text-xs font-bold uppercase", sevTone(i.severity))}>
          {i.severity ?? "—"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{i.ai_emergency_summary ?? t("liveSos.sosIncident")}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
            <span>{ago(i.created_at)}</span>
            <span>·</span>
            <span className="capitalize">{i.status.replace(/_/g, " ")}</span>
            {ambCode && (
              <>
                <span>·</span>
                <span className="font-mono font-semibold text-foreground">{ambCode}</span>
              </>
            )}
            {!ambCode && i.status === "open" && (
              <>
                <span>·</span>
                <span className="font-semibold text-destructive">{t("status.unassigned")}</span>
              </>
            )}
          </p>
        </div>
      </div>
    </button>
  );
}

const Stat = ({ label, value, bad, icon: Icon }: { label: string; value: string; bad?: boolean; icon?: any }) => (
  <div className={cn("rounded-lg border p-2", bad && "border-destructive/40 bg-destructive/5")}>
    <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className={cn("flex items-center gap-1 text-sm font-bold", bad && "text-destructive")}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {value}
    </p>
  </div>
);

const SectionLabel = ({ children, count }: { children: React.ReactNode; count: number }) => (
  <div className="flex items-center justify-between pt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
    <span>{children}</span>
    <span className="rounded-full bg-muted px-1.5 py-0.5 text-foreground">{count}</span>
  </div>
);

const EmptyRow = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl border border-dashed bg-card/50 p-4 text-center text-xs text-muted-foreground">{children}</div>
);

const KPI = ({ icon: Icon, label, value, tone }: any) => (
  <div className="rounded-xl border bg-card px-3 py-1.5">
    <div className="flex items-center gap-1 text-xs uppercase text-muted-foreground">
      <Icon className={cn("h-3 w-3", tone)} />
      {label}
    </div>
    <p className="text-base font-extrabold leading-none">{value}</p>
  </div>
);
