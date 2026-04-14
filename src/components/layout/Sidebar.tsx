import { NavLink, useLocation } from "react-router-dom";
import holarcLogo from "@/assets/holarc-logo-clear-2.png";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Settings,
  Settings2,
  Mic,
  LogOut,
  CheckSquare,
  Pill,
  Receipt,
  Loader2,
  MessageSquare,
  Bell,
  User,
  LucideIcon,
  DollarSign,
  Users2,
  Gift,
  Camera,
  UserPlus,
  Award,
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
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: Users, label: "My Patients", to: "/patients" },
  { icon: Settings2, label: "My Holarprac", to: "/practice" },
  { icon: UserCog, label: "Admin", to: "/admin" },
  { icon: Gift, label: "My Vulas", to: "/doctor/rewards" },
];

const patientNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: User, label: "My Holarchive", to: "/patient/details" },
  { icon: Calendar, label: "My Calendar", to: "/patient/calendar" },
  { icon: CheckSquare, label: "To-Do List", to: "/patient/tasks" },
  { icon: Gift, label: "My Vulas", to: "/patient/rewards" },
];

const adminNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: Users, label: "Users", to: "/admin/users" },
  { icon: DollarSign, label: "Pricing", to: "/admin/pricing" },
  { icon: Gift, label: "Rewards", to: "/admin/gamification" },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { role, loading: roleLoading, isPatient, isAdmin } = useUserRole();
  const loading = roleLoading;
  const { profile } = useProfile();
  const location = useLocation();
  const navItems = isAdmin ? adminNavItems : isPatient ? patientNavItems : doctorNavItems;

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
        <div className="flex h-20 items-center gap-3 px-6">
          <img src={holarcLogo} alt="Holarc Health" className="h-[62px] w-auto" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-1 space-y-0.5 overflow-y-auto font-size-preserve">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            navItems.map((item) => {
              const hasQuery = item.to.includes('?');
              const itemPath = hasQuery ? item.to.split('?')[0] : item.to;
              const itemSearch = hasQuery ? item.to.split('?')[1] : '';

              const isItemActive = hasQuery
                ? location.pathname === itemPath && location.search === `?${itemSearch}`
                : location.pathname === itemPath && (!location.search || !navItems.some(n => n.to.includes(`${itemPath}?`) && location.search === `?${n.to.split('?')[1]}`));

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={() =>
                    cn(
                      "flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200",
                      isItemActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.label === "Notifications" && unreadCount > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </NavLink>
              );
            })
          )}
        </nav>

        {/* Bottom Section - Account */}
        <div className="border-t border-sidebar-border mt-auto bg-sidebar-accent/30">
          <div className="flex items-center gap-3 px-4 pt-3 pb-2">
            <Avatar className="h-8 w-8 border-2 border-primary">
              <AvatarImage key={profile?.avatar_url} src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {profile?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              ) : (
                <p className="text-xs font-medium text-primary truncate">{profile?.full_name || "My Profile"}</p>
              )}
            </div>
          </div>
          <div className="px-3 pb-3 space-y-0.5">
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
                const { supabase } = await import("@/integrations/supabase/client");
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
