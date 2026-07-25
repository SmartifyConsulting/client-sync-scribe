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
import { useTranslation } from "react-i18next";

const doctorNavItems = [
  { icon: LayoutDashboard, labelKey: "nav.home", to: "/doctor-dashboard" },
  { icon: Users, labelKey: "bottomNav.patients", to: "/patients" },
  { icon: Briefcase, labelKey: "bottomNav.practice", to: "/practice" },
  { icon: UserCog, labelKey: "nav.admin", to: "/admin" },
  { icon: Siren, labelKey: "nav.sos", to: "/doctor/holarchelp", danger: true },
];

const patientSections = [
  { icon: Handshake, labelKey: "nav.myHolarchy", section: "health", to: "/patient/details?section=health" },
  { icon: FolderOpen, labelKey: "bottomNav.myDesk", section: "admin", to: "/patient/details?section=admin" },
  { icon: Gift, labelKey: "nav.myRewards", section: "rewards", to: "/patient/rewards" },
  { icon: Siren, labelKey: "nav.sos", section: "sos", to: "/patient/holarchelp", danger: true },
];

const adminNavItems = [
  { icon: Users, labelKey: "nav.users", to: "/admin/users" },
  { icon: DollarSign, labelKey: "nav.pricing", to: "/admin/pricing" },
  { icon: Gift, labelKey: "nav.rewards", to: "/admin/gamification" },
  { icon: Siren, labelKey: "nav.sos", to: "/patient/holarchelp", danger: true },
  { icon: Home, labelKey: "bottomNav.exit", to: "/doctor-dashboard" },
];

export function BottomNav() {
  const { t } = useTranslation();
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background safe-area-pb font-size-preserve md:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {adminNavItems.map((item) => {
            const isActive = (item as any).exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <button
                key={item.to + item.labelKey}
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
                <span className={cn("text-sm font-semibold text-center leading-tight", isActive && "text-primary")}>
                  {t(item.labelKey)}
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background safe-area-pb font-size-preserve md:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {doctorNavItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            const danger = (item as any).danger;
            if (danger) {
              return (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className="flex flex-col items-center gap-1 px-3 py-2 min-w-[64px] hover:opacity-80 transition-opacity"
                  aria-label="SOS"
                >
                  <div className="flex flex-col items-center justify-center h-11 w-11 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 transition-all duration-200">
                    <item.icon className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                    <span className="text-xs font-bold text-white leading-none mt-0.5">SOS</span>
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
                <span className={cn("text-sm font-semibold", isActive && "text-primary")}>{t(item.labelKey)}</span>
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background safe-area-pb font-size-preserve md:hidden">
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
                  <span className="text-xs font-bold text-white leading-none mt-0.5">SOS</span>
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
              <span className={cn("text-sm font-semibold", isActive && "text-primary")}>{t(item.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
