import { Link } from "react-router-dom";
import { Navigation as NavIcon, ChevronRight, Hospital, Clock, Truck } from "lucide-react";
import { useProviderAccess } from "../../../components/ProviderGate";
import { useActiveMissions } from "../../../hooks/useActiveMissions";
import { IncidentNumberBadge } from "@/components/IncidentNumberBadge";
import { MissionStatusStepper } from "../../../components/MissionStatusStepper";
import { EtaCountdown } from "../../../components/EtaCountdown";

export default function ActiveMissionsPanel() {
  const { providerId } = useProviderAccess();
  const missions = useActiveMissions(providerId);

  return (
    <section className="rounded-2xl border-2 border-destructive/60 bg-destructive/5 p-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5">
          <NavIcon className="h-4 w-4 text-destructive" /> Active Missions · {missions.length}
        </h2>
        <span className="text-xs text-muted-foreground">Tap a mission to open the full console</span>
      </div>
      {missions.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground italic">No active missions right now.</p>
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {missions.map((m) => (
            <Link
              key={m.id}
              to={`/provider/ambulance/navigation/${m.id}`}
              className="group rounded-xl border bg-background p-2.5 hover:border-destructive hover:bg-destructive/5 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <IncidentNumberBadge
                  number={m.incident_number ?? `INC-${m.id.slice(0, 8)}`}
                  size="sm"
                  showCopy={false}
                  label="Mission"
                />
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-destructive" />
              </div>
              <div className="mt-2 overflow-x-auto">
                <MissionStatusStepper currentStatus={m.status} compact />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1 min-w-0">
                  <Hospital className="h-3 w-3 text-primary shrink-0" />
                  <span className="truncate">{m.destination_hospital_name ?? "No hospital selected"}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-primary" />
                  ETA <EtaCountdown etaMinutes={m.eta_minutes ?? null} lastUpdate={m.last_eta_update ?? null} />
                </span>
                {m.vehicle_code && (
                  <span className="flex items-center gap-1">
                    <Truck className="h-3 w-3 text-primary" />
                    {m.vehicle_code}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
