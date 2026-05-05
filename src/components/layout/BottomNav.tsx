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
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

const doctorNavItems = [
  { icon: LayoutDashboard, label: "Home", to: "/doctor-dashboard" },
  { icon: Users, label: "Patients", to: "/patients" },
  { icon: Briefcase, label: "Practice", to: "/practice" },
  { icon: UserCog, label: "Admin", to: "/admin" },
  { icon: Gift, label: "Rewards", to: "/doctor/rewards" },
];

const patientSections = [
  { icon: User, label: "My Profile", section: "health", to: "/patient/details?section=health" },
  { icon: Handshake, label: "My Holarchy", section: "care", to: "/patient/details?section=care" },
  { icon: FolderOpen, label: "My Desk", section: "admin", to: "/patient/details?section=admin" },
  { icon: Gift, label: "My Rewards", section: "rewards", to: "/patient/rewards" },
  { icon: Siren, label: "SOS", section: "sos", to: "/patient/holarchelp", danger: true },
];

export function BottomNav() {
  const { isPatient, loading } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  if (loading) return null;

  const isOnPatientRoute = location.pathname.startsWith("/patient/");
  const showPatientNav = isPatient || isOnPatientRoute;

  if (!showPatientNav) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg safe-area-pb font-size-preserve md:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {doctorNavItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
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
          return (
            <button
              key={item.section}
              onClick={() => navigate(item.to)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 px-1 py-2 rounded-xl transition-all duration-200 min-w-0",
                danger
                  ? isActive ? "text-red-600" : "text-red-600 hover:text-red-700"
                  : isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-200",
                  isActive && (danger ? "bg-red-600/15 scale-110" : "bg-primary/15 scale-110"),
                )}
              >
                <item.icon className={cn("h-5 w-5", danger && "text-red-600", isActive && !danger && "text-primary")} />
              </div>
              <span className={cn("text-[10px] font-medium", danger ? "text-red-600" : isActive && "text-primary")}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
