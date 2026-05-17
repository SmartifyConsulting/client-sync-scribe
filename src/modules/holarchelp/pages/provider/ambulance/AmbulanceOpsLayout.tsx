import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Siren, Users, Truck, Wifi } from "lucide-react";
import { ProviderAppLayout } from "@/components/layout/ProviderAppLayout";
import { useProviderAccess } from "../../../components/ProviderGate";
import { useAmbulanceOpsStats } from "../../../hooks/useAmbulanceOpsStats";
import { cn } from "@/lib/utils";

type VehicleStatus = "available" | "dispatched" | "out_of_service";
type TeamStatus = "on_shift" | "off_shift";

const VEHICLE_KEY = "holarc_amb_vehicle_status";
const TEAM_KEY = "holarc_amb_team_status";

function AmbulanceStatsStrip() {
  const { providerId } = useProviderAccess();
  const { stats } = useAmbulanceOpsStats(providerId);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [vehicle, setVehicle] = useState<VehicleStatus>(
    () => (typeof localStorage !== "undefined" ? (localStorage.getItem(VEHICLE_KEY) as VehicleStatus) : null) || "available",
  );
  const [team, setTeam] = useState<TeamStatus>(
    () => (typeof localStorage !== "undefined" ? (localStorage.getItem(TEAM_KEY) as TeamStatus) : null) || "on_shift",
  );

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

  useEffect(() => { try { localStorage.setItem(VEHICLE_KEY, vehicle); } catch {} }, [vehicle]);
  useEffect(() => { try { localStorage.setItem(TEAM_KEY, team); } catch {} }, [team]);

  const vehicleTone =
    vehicle === "dispatched"
      ? "border-primary/40 bg-primary/10 text-primary"
      : vehicle === "out_of_service"
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : "border-success/40 bg-success/10 text-success";

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-card/60 p-2">
      {stats.currentIncidentId ? (
        <Link
          to={`/provider/ambulance/incident/${stats.currentIncidentId}`}
          className="inline-flex items-center gap-2 rounded-xl border border-sos/40 bg-sos/10 px-2.5 py-1.5 text-sos transition hover:bg-sos/15"
        >
          <Siren className="h-3.5 w-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Active mission</span>
          <span className="text-xs font-bold">#{stats.currentIncidentId.slice(0, 8)}</span>
        </Link>
      ) : (
        <span className="inline-flex items-center gap-2 rounded-xl border bg-card px-2.5 py-1.5 text-muted-foreground">
          <Siren className="h-3.5 w-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Standing by</span>
        </span>
      )}

      <button
        onClick={() => setTeam((s) => (s === "on_shift" ? "off_shift" : "on_shift"))}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider",
          team === "on_shift"
            ? "border-success/40 bg-success/10 text-success"
            : "border-border bg-card text-muted-foreground",
        )}
      >
        <Users className="h-3.5 w-3.5" />
        {team === "on_shift" ? "On shift" : "Off shift"}
      </button>

      <select
        value={vehicle}
        onChange={(e) => setVehicle(e.target.value as VehicleStatus)}
        className={cn("rounded-xl border bg-transparent px-2 py-1.5 text-xs font-bold uppercase tracking-wider", vehicleTone)}
      >
        <option value="available">🟢 Available</option>
        <option value="dispatched">🚑 Dispatched</option>
        <option value="out_of_service">⛔ Out of service</option>
      </select>

      <span className="inline-flex items-center gap-1.5 rounded-xl border bg-card px-2.5 py-1.5 text-[11px]">
        <Truck className="h-3.5 w-3.5 text-muted-foreground" />
        Open SOS <strong className="tabular-nums">{stats.openSos}</strong>
      </span>

      <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Wifi className={cn("h-3.5 w-3.5", online ? "text-success" : "text-destructive")} />
        {online ? "Online" : "Offline"}
      </span>
    </div>
  );
}

export default function AmbulanceOpsLayout() {
  return <ProviderAppLayout portal="ambulance" statsStrip={<AmbulanceStatsStrip />} />;
}
