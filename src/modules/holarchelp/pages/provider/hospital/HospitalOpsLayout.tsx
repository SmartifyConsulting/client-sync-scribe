import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider,
  SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Hospital, Siren, Ambulance, Stethoscope, BedDouble, Activity, ClipboardList, LogOut, UserCog, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useProviderAccess } from "../../../components/ProviderGate";
import { useHospitalOpsStats } from "../../../hooks/useHospitalOpsStats";
import { useEffect, useState } from "react";

const NAV = [
  { to: "/provider/hospital", icon: Siren, label: "Emergency Queue", end: true },
  { to: "/provider/hospital/incoming", icon: Ambulance, label: "Incoming Ambulances" },
  { to: "/provider/hospital/triage", icon: Stethoscope, label: "Triage" },
  { to: "/provider/hospital/admissions", icon: ClipboardList, label: "Admissions" },
  { to: "/provider/hospital/capacity", icon: BedDouble, label: "ER Capacity" },
  { to: "/provider/hospital/doctors", icon: Stethoscope, label: "Our Doctors" },
  { to: "/provider/hospital/ambulances", icon: Ambulance, label: "Our Ambulances" },
  { to: "/provider/hospital/timeline", icon: Activity, label: "Incident Timeline" },
];

function Brand() {
  const { state } = useSidebar();
  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sos/15 text-sos">
        <Hospital className="h-4 w-4" />
      </div>
      {state !== "collapsed" && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-extrabold">HolarcHelp</p>
          <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">Hospital Ops</p>
        </div>
      )}
    </div>
  );
}

function HospitalSidebar() {
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
              <NavLink to="/provider/hospital/profile" className="flex items-center gap-2">
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

function TopChip({ label, value, tone }: { label: string; value: React.ReactNode; tone: string }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-xl border px-2.5 py-1.5", tone)}>
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</span>
      <span className="text-sm font-extrabold tabular-nums">{value}</span>
    </div>
  );
}

function useClock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  return t;
}

function TopBar() {
  const { providerId } = useProviderAccess();
  const { stats } = useHospitalOpsStats(providerId);
  const now = useClock();
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const capTone =
    stats.capacityStatus === "red" ? "border-red-500/40 bg-red-500/10 text-red-700"
    : stats.capacityStatus === "yellow" ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-700"
    : "border-green-500/40 bg-green-500/10 text-green-700";

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur">
      <SidebarTrigger />
      <div className="hidden h-8 w-px bg-border sm:block" />
      <div className="flex flex-1 flex-wrap items-center gap-1.5">
        <TopChip label="Active emergencies" value={stats.activeEmergencies} tone="border-sos/40 bg-sos/10 text-sos" />
        <TopChip label="Incoming ambulances" value={stats.incomingAmbulances} tone="border-primary/40 bg-primary/10 text-primary" />
        <TopChip label="ICU beds" value={stats.icuAvailable ?? "—"} tone="border-border bg-card text-foreground" />
        <TopChip label="ER capacity" value={(stats.capacityStatus ?? "green").toUpperCase()} tone={capTone} />
        <TopChip label="Alerts" value={stats.alerts} tone="border-orange-500/40 bg-orange-500/10 text-orange-700" />
      </div>
      <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
        <Wifi className={cn("h-3.5 w-3.5", online ? "text-green-600" : "text-destructive")} />
        <span className="tabular-nums">{now.toLocaleTimeString()}</span>
      </div>
    </header>
  );
}

export default function HospitalOpsLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-dvh w-full bg-muted/20">
        <HospitalSidebar />
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
