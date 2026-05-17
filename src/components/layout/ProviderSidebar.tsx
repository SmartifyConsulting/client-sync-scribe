import { NavLink, useLocation } from "react-router-dom";
import holarcLogo from "@/assets/holarc-logo-clear-2.png";
import holarcHelpLogo from "@/assets/holarc-help-logo.png";
import { cn } from "@/lib/utils";
import {
  Settings,
  LogOut,
  LucideIcon,
  UserCog,
  Siren,
  Ambulance,
  Stethoscope,
  BedDouble,
  Activity,
  ClipboardList,
  Hospital,
  Navigation as NavIcon,
  History,
  Users,
  HeartPulse,
  ArrowLeft,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

interface NavItem {
  icon: LucideIcon;
  label: string;
  to: string;
  end?: boolean;
  danger?: boolean;
}

const hospitalNav: NavItem[] = [
  { icon: Siren, label: "Emergency Queue", to: "/provider/hospital", end: true, danger: true },
  { icon: Ambulance, label: "Incoming ER", to: "/provider/hospital/incoming" },
  { icon: Stethoscope, label: "Triage", to: "/provider/hospital/triage" },
  { icon: ClipboardList, label: "Admissions", to: "/provider/hospital/admissions" },
  { icon: BedDouble, label: "ER Capacity", to: "/provider/hospital/capacity" },
  { icon: Stethoscope, label: "Our Doctors", to: "/provider/hospital/doctors" },
  { icon: HeartPulse, label: "Our Nurses", to: "/provider/hospital/nurses" },
  { icon: Ambulance, label: "Our ER Providers", to: "/provider/hospital/ambulances" },
  { icon: Activity, label: "Incident Timeline", to: "/provider/hospital/timeline" },
];

const ambulanceNav: NavItem[] = [
  { icon: Siren, label: "Active Incidents", to: "/provider/ambulance", end: true, danger: true },
  { icon: Ambulance, label: "Incoming SOS", to: "/provider/ambulance/incoming" },
  { icon: NavIcon, label: "Navigation", to: "/provider/ambulance/navigation" },
  { icon: Hospital, label: "Hospitals", to: "/provider/ambulance/hospitals" },
  { icon: Hospital, label: "Affiliated Hospitals", to: "/provider/ambulance/affiliations" },
  { icon: History, label: "Incident History", to: "/provider/ambulance/history" },
  { icon: Users, label: "Team Status", to: "/provider/ambulance/team" },
];

interface ProviderSidebarProps {
  portal: "hospital" | "ambulance";
  onNavigate?: () => void;
}

export function ProviderSidebar({ portal, onNavigate }: ProviderSidebarProps) {
  const { profile } = useProfile();
  const location = useLocation();
  const nav = portal === "hospital" ? hospitalNav : ambulanceNav;
  const profilePath = portal === "hospital" ? "/provider/hospital/profile" : "/provider/ambulance/profile";
  const logo = portal === "ambulance" ? holarcHelpLogo : holarcLogo;
  const logoAlt = portal === "ambulance" ? "Holarc Help" : "Holarc Health";

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[210px] bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        <div className="flex h-20 items-center gap-3 px-6">
          <img src={logo} alt={logoAlt} className="h-12 w-auto object-contain" />
        </div>

        <nav className="flex-1 px-4 py-1 space-y-0.5 overflow-y-auto font-size-preserve">
          {nav.map((item) => {
            const isActive = item.end
              ? location.pathname === item.to
              : location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  isActive
                    ? item.danger
                      ? "bg-red-600 text-white shadow-sm"
                      : "bg-primary text-primary-foreground shadow-sm"
                    : item.danger
                      ? "text-red-600 hover:bg-red-600/10"
                      : "text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border mt-auto bg-sidebar-accent/30">
          <div className="flex items-center gap-3 px-4 pt-3 pb-2">
            <Avatar className="h-8 w-8 border-2 border-primary">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {profile?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-primary truncate">{profile?.full_name || "Provider"}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                {portal === "hospital" ? "Hospital Ops" : "ER Provider"}
              </p>
            </div>
          </div>
          <div className="px-3 pb-3 space-y-0.5">
            <NavLink
              to={profilePath}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-primary hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )
              }
            >
              <UserCog className="h-4 w-4" />
              Provider Profile
            </NavLink>
            <NavLink
              to="/settings"
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-primary hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )
              }
            >
              <Settings className="h-4 w-4" />
              Settings
            </NavLink>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/auth";
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
