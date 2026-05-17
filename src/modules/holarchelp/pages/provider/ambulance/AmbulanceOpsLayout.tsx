import { NavLink, Outlet, Link } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider,
  SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Siren, Ambulance, Navigation as NavIcon, Hospital, History, Users, LogOut, UserCog, Wifi, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useProviderAccess } from "../../../components/ProviderGate";
import { useAmbulanceOpsStats } from "../../../hooks/useAmbulanceOpsStats";
import { useEffect, useState } from "react";

const NAV = [
  { to: "/provider/ambulance", icon: Siren, label: "Active Incidents", end: true },
  { to: "/provider/ambulance/incoming", icon: Ambulance, label: "Incoming SOS" },
  { to: "/provider/ambulance/navigation", icon: NavIcon, label: "Navigation" },
  { to: "/provider/ambulance/hospitals", icon: Hospital, label: "Hospitals" },
  { to: "/provider/ambulance/affiliations", icon: Hospital, label: "Affiliated Hospitals" },
  { to: "/provider/ambulance/history", icon: History, label: "Incident History" },
  { to: "/provider/ambulance/team", icon: Users, label: "Team Status" },
];

function Brand() {
  const { state } = useSidebar();
  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sos/15 text-sos">
        <Ambulance className="h-4 w-4" />
      </div>
      {state !== "collapsed" && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-extrabold">HolarcHelp</p>
          <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">Dispatch</p>
        </div>
      )}
    </div>
  );
}

function AmbulanceSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader><Brand /></SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((i) => (
                <SidebarMenuItem key={i.to}>
                  <SidebarMenuButton asChild tooltip={i.label}>
                    <NavLink
                      to={i.to}
                      end={i.end}
                      className={({ isActive }) =>
                        cn("flex items-center gap-2", isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold")
                      }
                    >
                      <i.icon className="h-4 w-4" />
                      <span>{i.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Profile">
              <NavLink to="/provider/ambulance/profile" className="flex items-center gap-2">
                <UserCog className="h-4 w-4" /> <span>Profile</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign out"
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}
            >
              <LogOut className="h-4 w-4" /> <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

type VehicleStatus = "available" | "dispatched" | "out_of_service";
type TeamStatus = "on_shift" | "off_shift";

const VEHICLE_KEY = "holarc_amb_vehicle_status";
const TEAM_KEY = "holarc_amb_team_status";

function TopBar() {
  const { providerId } = useProviderAccess();
  const { stats } = useAmbulanceOpsStats(providerId);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [vehicle, setVehicle] = useState<VehicleStatus>(() => (typeof localStorage !== "undefined" ? (localStorage.getItem(VEHICLE_KEY) as VehicleStatus) : null) || "available");
  const [team, setTeam] = useState<TeamStatus>(() => (typeof localStorage !== "undefined" ? (localStorage.getItem(TEAM_KEY) as TeamStatus) : null) || "on_shift");

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => { try { localStorage.setItem(VEHICLE_KEY, vehicle); } catch {} }, [vehicle]);
  useEffect(() => { try { localStorage.setItem(TEAM_KEY, team); } catch {} }, [team]);

  const vehicleTone =
    vehicle === "dispatched" ? "border-primary/40 bg-primary/10 text-primary"
    : vehicle === "out_of_service" ? "border-destructive/40 bg-destructive/10 text-destructive"
    : "border-green-500/40 bg-green-500/10 text-green-700";

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur">
      <SidebarTrigger />
      <div className="hidden h-8 w-px bg-border sm:block" />
      <div className="flex flex-1 flex-wrap items-center gap-1.5">
        {stats.currentIncidentId ? (
          <Link to={`/provider/ambulance/incident/${stats.currentIncidentId}`}
                className="inline-flex items-center gap-2 rounded-xl border border-sos/40 bg-sos/10 px-2.5 py-1.5 text-sos transition hover:bg-sos/15">
            <Siren className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Active mission</span>
            <span className="text-xs font-bold">#{stats.currentIncidentId.slice(0,8)}</span>
          </Link>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-xl border bg-card px-2.5 py-1.5 text-muted-foreground">
            <Siren className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Standing by</span>
          </span>
        )}

        <button
          onClick={() => setTeam((s) => s === "on_shift" ? "off_shift" : "on_shift")}
          className={cn("inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider",
            team === "on_shift" ? "border-green-500/40 bg-green-500/10 text-green-700" : "border-border bg-card text-muted-foreground")}
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
      </div>
      <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
        <Wifi className={cn("h-3.5 w-3.5", online ? "text-green-600" : "text-destructive")} />
        <span>{online ? "Online" : "Offline"}</span>
      </div>
    </header>
  );
}

export default function AmbulanceOpsLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-dvh w-full bg-muted/20">
        <AmbulanceSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="min-w-0 flex-1 p-3 sm:p-5">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
