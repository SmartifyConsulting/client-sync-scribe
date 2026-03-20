import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Settings,
  Mic,
  Pill,
  Receipt,
  Stethoscope,
  CheckSquare,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

const doctorNavItems = [
  { icon: LayoutDashboard, label: "Home", to: "/dashboard" },
  { icon: Users, label: "Patients", to: "/patients" },
  { icon: Calendar, label: "Calendar", to: "/calendar" },
  { icon: Mic, label: "Sessions", to: "/sessions" },
  { icon: Settings, label: "Settings", to: "/settings" },
];

const patientNavItems = [
  { icon: LayoutDashboard, label: "Home", to: "/dashboard" },
  { icon: Stethoscope, label: "My Holarchive", to: "/patient/details" },
  { icon: Calendar, label: "Calendar", to: "/patient/calendar" },
  { icon: Settings, label: "Settings", to: "/settings" },
];

export function BottomNav() {
  const { isPatient } = useUserRole();
  const navItems = isPatient ? patientNavItems : doctorNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg safe-area-pb md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[64px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
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
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
