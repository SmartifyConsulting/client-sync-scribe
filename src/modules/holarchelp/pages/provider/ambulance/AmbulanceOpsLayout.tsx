import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Siren, Truck, Wifi, PlayCircle, StopCircle, Loader2 } from "lucide-react";
import { ProviderAppLayout } from "@/components/layout/ProviderAppLayout";
import { useProviderAccess } from "../../../components/ProviderGate";
import { useAmbulanceOpsStats } from "../../../hooks/useAmbulanceOpsStats";
import { useParamedicShift } from "../../../hooks/useParamedicShift";
import { useShiftTelematics } from "../../../hooks/useShiftTelematics";
import { StartShiftDialog } from "../../../components/StartShiftDialog";
import { toastError } from "@/lib/userMessage";

import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

function AmbulanceStatsStrip() {
  const { t } = useTranslation();
  const { providerId } = useProviderAccess();
  const { stats } = useAmbulanceOpsStats(providerId);
  const { shift, endShift } = useParamedicShift();
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [startOpen, setStartOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  useShiftTelematics(providerId, !!shift, (shift as any)?.vehicle_id ?? null);


  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const onEnd = async () => {
    setEnding(true);
    try { await endShift(); toast.success(t("provider.shiftEnded")); }
    catch (e: any) { toast.error(e.message ?? t("provider.couldNotEndShift")); }
    finally { setEnding(false); }
  };

  const statusTone =
    !shift ? "border-border bg-card text-muted-foreground"
    : shift.status === "busy" ? "border-destructive/40 bg-destructive/10 text-destructive"
    : "border-success/40 bg-success/10 text-success";

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-card/60 p-2">
      {/* 1. Action: Start / End Shift FIRST */}
      {!shift ? (
        <button
          onClick={() => setStartOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/15"
        >
          <PlayCircle className="h-3.5 w-3.5" /> {t("provider.startShift")}
        </button>
      ) : (
        <button
          onClick={onEnd}
          disabled={ending || shift.status === "busy"}
          title={shift.status === "busy" ? t("provider.finishActiveIncidentFirst") : ""}
          className="inline-flex items-center gap-1.5 rounded-xl border bg-card px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          {ending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StopCircle className="h-3.5 w-3.5" />}
          {t("provider.endShift")}
        </button>
      )}

      {/* 2. Status badge */}
      <span className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider",
        statusTone,
      )}>
        <Truck className="h-3.5 w-3.5" />
        {!shift ? t("status.offShift") : shift.status === "busy" ? t("status.busy") : t("status.available")}
      </span>

      {/* 3. Active mission chip — ONLY when there is one */}
      {stats.currentIncidentId && (
        <Link
          to={`/provider/ambulance/incident/${stats.currentIncidentId}`}
          className="inline-flex items-center gap-2 rounded-xl border border-sos/40 bg-sos/10 px-2.5 py-1.5 text-sos transition hover:bg-sos/15"
        >
          <Siren className="h-3.5 w-3.5" />
          <span className="text-xs font-bold uppercase tracking-wider">{t("provider.activeMission")}</span>
          <span className="text-xs font-bold">#{stats.currentIncidentId.slice(0, 8)}</span>
        </Link>
      )}

      <span className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <Wifi className={cn("h-3.5 w-3.5", online ? "text-success" : "text-destructive")} />
        {online ? t("provider.online") : t("provider.offline")}
      </span>

      <StartShiftDialog providerId={providerId} open={startOpen} onOpenChange={setStartOpen} />
    </div>
  );
}


export default function AmbulanceOpsLayout() {
  return <ProviderAppLayout portal="ambulance" statsStrip={<AmbulanceStatsStrip />} />;
}
