import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  User,
  Handshake,
  FolderOpen,
  Users,
  Briefcase,
  UserCog,
  Gift,
  Siren,
  DollarSign,
  Home,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const doctorNavItems = [
  { icon: LayoutDashboard, label: "Home", to: "/doctor-dashboard" },
  { icon: Users, label: "Patients", to: "/patients" },
  { icon: Briefcase, label: "Practice", to: "/practice" },
  { icon: UserCog, label: "Admin", to: "/admin" },
  { icon: Siren, label: "SOS", to: "/doctor/holarchelp", danger: true },
];

const patientSections = [
  { icon: User, label: "My Profile", section: "health", to: "/patient/details?section=health" },
  { icon: Handshake, label: "My Holarchy", section: "care", to: "/patient/details?section=care" },
  { icon: FolderOpen, label: "My Desk", section: "admin", to: "/patient/details?section=admin" },
  { icon: Gift, label: "My Rewards", section: "rewards", to: "/patient/rewards" },
  { icon: Siren, label: "SOS", section: "sos", to: "/patient/holarchelp", danger: true },
];

const adminNavItems = [
  { icon: Users, label: "Users", to: "/admin/users" },
  { icon: DollarSign, label: "Pricing", to: "/admin/pricing" },
  { icon: Gift, label: "Rewards", to: "/admin/gamification" },
  { icon: LayoutDashboard, label: "Hub", to: "/admin", exact: true },
  { icon: Home, label: "Exit Admin", to: "/doctor-dashboard" },
];

export function BottomNav() {
  const { isPatient, loading } = useUserRole();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  if (loading) return null;

  const isOnAdminRoute = location.pathname.startsWith("/admin");

  // Admin variant — shown whenever an admin is on an /admin/* route
  if (isAdmin && isOnAdminRoute) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg safe-area-pb font-size-preserve md:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {adminNavItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <button
                key={item.to + item.label}
                onClick={() => navigate(item.to)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 px-1 py-2 rounded-xl transition-all duration-200 min-w-0",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-200",
                    isActive && "bg-primary/15 scale-110",
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                </div>
                <span className={cn("text-[10px] font-medium text-center leading-tight", isActive && "text-primary")}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  const isOnPatientRoute = location.pathname.startsWith("/patient/");
  const showPatientNav = isPatient || isOnPatientRoute;

  if (!showPatientNav) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg safe-area-pb font-size-preserve md:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {doctorNavItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            const danger = (item as any).danger;
            if (danger) {
              return (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className="flex flex-col items-center gap-1 px-3 py-2 min-w-[64px]"
                  aria-label="SOS"
                >
                  <div className="flex flex-col items-center justify-center h-11 w-11 rounded-full bg-red-600 active:scale-95 transition-transform">
                    <item.icon className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                    <span className="text-[8px] font-bold text-white leading-none mt-0.5">SOS</span>
                  </div>
                </button>
              );
            }
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[64px]",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-200",
                    isActive && "bg-primary/15 scale-110",
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                </div>
                <span className={cn("text-[10px] font-medium", isActive && "text-primary")}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // Patient nav - section-based
  const currentSection = searchParams.get("section") || "health";
  const isOnDetails = location.pathname === "/patient/details";

  const items = patientSections;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg safe-area-pb font-size-preserve md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const isActive =
            item.section === "rewards"
              ? location.pathname === "/patient/rewards"
              : item.section === "sos"
              ? location.pathname.startsWith("/patient/holarchelp")
              : isOnDetails && currentSection === item.section;
          const danger = (item as any).danger;
          if (danger) {
            return (
              <button
                key={item.section}
                onClick={() => navigate(item.to)}
                className="flex flex-1 flex-col items-center gap-1 px-1 py-2 min-w-0"
                aria-label="SOS"
              >
                <div className="flex flex-col items-center justify-center h-11 w-11 rounded-full bg-red-600 active:scale-95 transition-transform">
                  <item.icon className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                  <span className="text-[8px] font-bold text-white leading-none mt-0.5">SOS</span>
                </div>
              </button>
            );
          }
          return (
            <button
              key={item.section}
              onClick={() => navigate(item.to)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 px-1 py-2 rounded-xl transition-all duration-200 min-w-0",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-200",
                  isActive && "bg-primary/15 scale-110",
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
              </div>
              <span className={cn("text-[10px] font-medium", isActive && "text-primary")}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
