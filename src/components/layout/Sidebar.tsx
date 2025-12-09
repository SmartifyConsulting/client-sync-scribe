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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const doctorNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/" },
  { icon: Inbox, label: "Inbox", to: "/inbox" },
  { icon: Users, label: "Patients", to: "/patients" },
  { icon: Calendar, label: "Calendar", to: "/calendar" },
  { icon: CheckSquare, label: "To-Do List", to: "/todos" },
  { icon: FileText, label: "Templates", to: "/documents" },
  { icon: Mic, label: "Sessions", to: "/sessions" },
  { icon: Receipt, label: "Invoices", to: "/invoices" },
];

const patientNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/" },
  { icon: Calendar, label: "My Calendar", to: "/patient/calendar" },
  { icon: Pill, label: "Prescriptions", to: "/patient/prescriptions" },
  { icon: Receipt, label: "Invoices", to: "/patient/invoices" },
  { icon: Shield, label: "Access", to: "/patient/access" },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { role, loading, isPatient } = useUserRole();
  const navItems = isPatient ? patientNavItems : doctorNavItems;

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-messages-count"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false);

      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[210px] bg-sidebar border-r border-sidebar-border">
      {/* Subtle teal gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-primary/[0.02] pointer-events-none" />
      
      <div className="relative flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-20 items-center gap-3 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-teal">
            <span className="text-lg font-bold text-primary-foreground">M</span>
          </div>
          <div>
            <span className="text-lg font-semibold text-foreground tracking-tight">mIRI</span>
            <p className="text-[10px] text-primary/70 font-medium">Medical Intelligence</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-teal"
                      : "text-sidebar-foreground hover:bg-primary/10 hover:text-primary",
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.label === "Inbox" && unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </NavLink>
            ))
          )}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 space-y-1 border-t border-primary/10">
          <NavLink
            to="/settings"
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-teal"
                  : "text-sidebar-foreground hover:bg-primary/10 hover:text-primary",
              )
            }
          >
            <Settings className="h-4 w-4" />
            Settings
          </NavLink>
          <button
            onClick={async () => {
              const { supabase } = await import("@/integrations/supabase/client");
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
