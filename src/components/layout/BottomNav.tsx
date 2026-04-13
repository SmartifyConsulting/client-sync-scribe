import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Mic,
  Briefcase,
  HeartPulse,
  Handshake,
  FolderOpen,
  Gift,
  Shield,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

const doctorNavItems = [
  { icon: LayoutDashboard, label: "Home", to: "/dashboard" },
  { icon: Users, label: "Patients", to: "/patients" },
  { icon: Mic, label: "Sessions", to: "/sessions" },
  { icon: Briefcase, label: "Practice", to: "/practice" },
  { icon: Gift, label: "Rewards", to: "/doctor/rewards" },
  { icon: Shield, label: "Admin", to: "/admin" },
];

const patientSections = [
  { icon: LayoutDashboard, label: "Home", section: "home" },
  { icon: HeartPulse, label: "My Profile", section: "health" },
  { icon: Handshake, label: "My Healthcare", section: "care" },
  { icon: FolderOpen, label: "My Desk", section: "admin" },
  { icon: Gift, label: "My Rewards", section: "rewards" },
];

export function BottomNav() {
  const { isPatient } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  if (!isPatient) {
    // Doctor nav - route-based
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg safe-area-pb md:hidden font-size-preserve">
        <div className="flex items-center justify-around px-2 py-2">
          {doctorNavItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[64px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-200",
                    isActive && "bg-primary/15 scale-110"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                </div>
                <span className={cn("text-[10px] font-medium", isActive && "text-primary")}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // Patient nav - section-based
  const currentSection = searchParams.get("section") || "home";
  const isOnDetails = location.pathname === "/patient/details";
  const isOnRewards = location.pathname === "/patient/rewards";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg safe-area-pb md:hidden font-size-preserve">
      <div className="flex items-center justify-around px-2 py-2">
        {patientSections.map((item) => {
          const isActive =
            item.section === "rewards"
              ? isOnRewards
              : isOnDetails && currentSection === item.section;
          return (
            <button
              key={item.section}
              onClick={() => {
                if (item.section === "rewards") {
                  navigate("/patient/rewards");
                } else {
                  navigate(`/patient/details?section=${item.section}`);
                }
              }}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 px-1 py-2 rounded-xl transition-all duration-200 min-w-0",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-200",
                  isActive && "bg-primary/15 scale-110"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
              </div>
              <span className={cn("text-[10px] font-medium", isActive && "text-primary")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
