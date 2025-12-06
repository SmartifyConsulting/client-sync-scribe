import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Settings,
  Mic,
  LogOut,
  CheckSquare,
  Pill,
  Receipt,
  Loader2,
  Shield,
  Inbox,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

const doctorNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/" },
  { icon: Users, label: "Patients", to: "/patients" },
  { icon: Calendar, label: "Calendar", to: "/calendar" },
  { icon: CheckSquare, label: "To-Do List", to: "/todos" },
  { icon: FileText, label: "Templates", to: "/documents" },
  { icon: Mic, label: "Sessions", to: "/sessions" },
  { icon: Receipt, label: "Invoices", to: "/invoices" },
  { icon: Inbox, label: "Inbox", to: "/inbox" },
];

const patientNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/" },
  { icon: Calendar, label: "My Calendar", to: "/patient/calendar" },
  { icon: Pill, label: "Prescriptions", to: "/patient/prescriptions" },
  { icon: Receipt, label: "Invoices", to: "/patient/invoices" },
  { icon: Shield, label: "Access", to: "/patient/access" },
];

export function Sidebar() {
  const { role, loading, isPatient } = useUserRole();
  const navItems = isPatient ? patientNavItems : doctorNavItems;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">M</span>
          </div>
          <span className="text-xl font-semibold text-foreground">MedPad</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))
          )}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-sidebar-border p-4">
          <NavLink
            to="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent/50"
          >
            <Settings className="h-5 w-5" />
            Settings
          </NavLink>
          <button 
            onClick={async () => {
              const { supabase } = await import('@/integrations/supabase/client');
              await supabase.auth.signOut();
              window.location.href = '/auth';
            }}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
