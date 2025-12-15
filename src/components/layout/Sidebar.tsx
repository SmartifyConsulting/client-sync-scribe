import { NavLink, useLocation } from "react-router-dom";
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
  Bell,
  User,
  LucideIcon,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavItem {
  icon: LucideIcon;
  label: string;
  to: string;
}

const doctorNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/" },
  { icon: Bell, label: "Notifications", to: "/notifications" },
  { icon: CheckSquare, label: "To-Do List", to: "/todos" },
  { icon: Calendar, label: "Calendar", to: "/calendar" },
  { icon: Users, label: "Patients", to: "/patients" },
  { icon: Mic, label: "Sessions", to: "/sessions" },
  { icon: Receipt, label: "Invoices", to: "/invoices" },
  { icon: FileText, label: "Templates", to: "/documents" },
];

const patientNavItems: NavItem[] = [
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
  const { profile } = useProfile();
  const navItems = isPatient ? patientNavItems : doctorNavItems;

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications-count"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return 0;

      // Count unread messages
      const { count: messagesCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false);

      // Count unread notifications (documents, etc.)
      const { count: notificationsCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      return (messagesCount || 0) + (notificationsCount || 0);
    },
    refetchInterval: 30000,
  });

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[210px] bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-20 items-center gap-3 px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary shadow-md">
            <span className="text-xl font-bold text-primary-foreground">M</span>
          </div>
          <div>
            <span className="text-xl font-semibold text-foreground tracking-tight">mIRI</span>
            <p className="text-xs text-muted-foreground">Medical Integrated Record Intelligence</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-1 space-y-0.5 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-primary hover:bg-sidebar-accent hover:text-primary-foreground",
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1">{item.label}</span>
                {item.label === "Notifications" && unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </NavLink>
            ))
          )}
        </nav>

        {/* Bottom Section - Account */}
        <div className="border-t border-sidebar-border mt-auto bg-sidebar-accent/30">
          <div className="flex items-center gap-3 px-4 pt-3 pb-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {profile?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{profile?.full_name || "User"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{profile?.specialty || profile?.role || "Account"}</p>
            </div>
          </div>
          <div className="px-3 pb-3 space-y-0.5">
            <NavLink
              to="/profile"
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-primary hover:bg-sidebar-accent hover:text-primary-foreground",
                )
              }
            >
              <User className="h-5 w-5" />
              Profile
            </NavLink>
            <NavLink
              to="/settings"
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-primary hover:bg-sidebar-accent hover:text-primary-foreground",
                )
              }
            >
              <Settings className="h-5 w-5" />
              Settings
            </NavLink>
            <button
              onClick={async () => {
                const { supabase } = await import("@/integrations/supabase/client");
                await supabase.auth.signOut();
                window.location.href = "/auth";
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
