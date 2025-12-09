import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Mic,
  Settings,
  Pill,
  Receipt,
  Shield,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

const doctorNavItems = [
  { icon: LayoutDashboard, label: "Home", to: "/" },
  { icon: Users, label: "Patients", to: "/patients" },
  { icon: Calendar, label: "Calendar", to: "/calendar" },
  { icon: Mic, label: "Sessions", to: "/sessions" },
  { icon: Settings, label: "Settings", to: "/settings" },
];

const patientNavItems = [
  { icon: LayoutDashboard, label: "Home", to: "/" },
  { icon: Calendar, label: "Calendar", to: "/patient/calendar" },
  { icon: Pill, label: "Rx", to: "/patient/prescriptions" },
  { icon: Receipt, label: "Invoices", to: "/patient/invoices" },
  { icon: Shield, label: "Access", to: "/patient/access" },
];

export function BottomNav() {
  const { isPatient } = useUserRole();
  const navItems = isPatient ? patientNavItems : doctorNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary/10 bg-background/95 backdrop-blur-lg safe-area-pb md:hidden">
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
                  : "text-muted-foreground hover:text-primary/70"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    "flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-200",
                    isActive && "bg-primary text-primary-foreground scale-110 shadow-teal"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "")} />
                </div>
                <span className={cn("text-[10px] font-medium", isActive && "text-primary font-semibold")}>
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
