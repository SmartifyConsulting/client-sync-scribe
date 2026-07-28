import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import holarcLogoAsset from "@/assets/holarc-health-logo.png.asset.json";
const holarcLogo = holarcLogoAsset.url;
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  Settings2,
  LogOut,
  Loader2,
  User,
  LucideIcon,
  DollarSign,
  Gift,
  UserCog,
  FolderOpen,
  Siren,
  ListChecks,
  Users2,
  Mic,
  BedDouble,
} from "lucide-react";

import { useUserRole } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { INTAKE_EMAIL_DOMAIN } from "@/lib/mailboxDomain";

interface NavItem {
  icon: LucideIcon;
  label: string;
  labelKey: string;
  to: string;
  danger?: boolean;
}

const doctorNavItems: (NavItem & { tour?: string })[] = [
  { icon: LayoutDashboard, label: "Home", labelKey: "nav.home", to: "/doctor-dashboard", tour: "doctor-home" },
  { icon: User, label: "My Profile", labelKey: "nav.myProfile", to: "/patient/details?section=health" },
  { icon: Settings2, label: "My Practice", labelKey: "nav.myPractice", to: "/practice", tour: "practice-settings" },
  { icon: Users, label: "My Patients", labelKey: "nav.myPatients", to: "/patients", tour: "import-patients" },
  { icon: BedDouble, label: "Admissions", labelKey: "nav.admissions", to: "/admissions" },
  { icon: Calendar, label: "My Calendar", labelKey: "nav.myCalendar", to: "/calendar" },
  { icon: Mic, label: "Sessions", labelKey: "nav.mySessions", to: "/my-sessions" },
  { icon: ListChecks, label: "Tasks", labelKey: "nav.myTasks", to: "/todos", tour: "doctor-tasks" },
  { icon: FolderOpen, label: "Documents", labelKey: "nav.allDocuments", to: "/documents" },
  { icon: Users2, label: "Round Tables", labelKey: "nav.myRoundTables", to: "/doctor/round-tables" },
  { icon: Gift, label: "My Rewards", labelKey: "nav.myRewards", to: "/doctor/rewards" },
  { icon: Siren, label: "SOS", labelKey: "nav.sos", to: "/doctor/holarchelp", danger: true },
];

const patientNavItems: (NavItem & { tour?: string })[] = [
  { icon: Users, label: "My Profile", labelKey: "nav.myHolarchy", to: "/patient/details?section=health", tour: "patient-holarchy" },
  { icon: BedDouble, label: "My Admissions", labelKey: "nav.myAdmissions", to: "/patient/admissions" },
  { icon: Calendar, label: "My Calendar", labelKey: "nav.myCalendar", to: "/patient/calendar" },
  { icon: ListChecks, label: "My Tasks", labelKey: "nav.myTasks", to: "/patient/tasks", tour: "patient-tasks" },
  { icon: FolderOpen, label: "My Documents", labelKey: "nav.myDocuments", to: "/patient/documents" },
  { icon: Gift, label: "My Rewards", labelKey: "nav.myRewards", to: "/patient/rewards" },
  { icon: Siren, label: "SOS", labelKey: "nav.sos", to: "/patient/holarchelp", danger: true, tour: "patient-sos" },
];

const adminNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Home", labelKey: "nav.home", to: "/doctor-dashboard" },
  { icon: Users, label: "Users", labelKey: "nav.users", to: "/admin/users" },
  { icon: DollarSign, label: "Pricing", labelKey: "nav.pricing", to: "/admin/pricing" },
  { icon: Gift, label: "Rewards", labelKey: "nav.rewards", to: "/admin/gamification" },
  { icon: Siren, label: "SOS", labelKey: "nav.sos", to: "/patient/holarchelp", danger: true },
  { icon: Siren, label: "Hospital Portal", labelKey: "nav.hospitalPortal", to: "/provider/hospital", danger: true },
  { icon: Siren, label: "ER Portal", labelKey: "nav.erPortal", to: "/provider/ambulance", danger: true },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { t } = useTranslation();
  const { role, loading: roleLoading, isPatient, isAdmin } = useUserRole();
  const loading = roleLoading;
  const { profile } = useProfile();
  const location = useLocation();
  const isOnPatientRoute = location.pathname.startsWith("/patient/");
  const isOnAdminRoute = location.pathname.startsWith("/admin");

  const mailboxAlias = (profile as any)?.mailbox_alias as string | null | undefined;
  const mailboxId = (profile as any)?.mailbox_id as string | null | undefined;
  const mailboxAddress = mailboxAlias
    ? `${mailboxAlias}@${INTAKE_EMAIL_DOMAIN}`
    : mailboxId
      ? `docs-${mailboxId.slice(0, 8)}@inbox.holarc.health`
      : "";



  // Doctors keep their own menu even when viewing patient-scoped routes such as
  // "My Profile" (/patient/details) — the route alone must not flip the nav.
  // While the role is still resolving we must NOT fall back to the route-based
  // guess, otherwise a doctor sees the patient nav for one frame.
  const isDoctor = role === "doctor";
  const routeSaysPatient = isOnPatientRoute && !roleLoading && role !== null;
  const baseNav = isOnAdminRoute && isAdmin
    ? adminNavItems
    : (!isDoctor && (isPatient || routeSaysPatient)) ? patientNavItems : doctorNavItems;

  // For admins not currently on an admin route, surface an "Admin" entry so
  // they can always reach the admin section.
  const navItems = isAdmin && !isOnAdminRoute
    ? [...baseNav, { icon: UserCog, label: "Admin", labelKey: "nav.admin", to: "/admin/users" }]
    : baseNav;

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
    <aside className="fixed left-0 top-0 z-40 h-screen w-[252px] bg-sidebar">
      <div className="flex h-full flex-col">
        <div className="flex h-24 items-center gap-3 px-6">
          <img src={holarcLogo} alt="Holarc Health" className="h-[82px] w-auto object-contain" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 pt-[1.5cm] py-1 space-y-1.5 overflow-y-auto font-size-preserve">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            navItems.map((item) => {
              const hasQuery = item.to.includes("?");
              const itemPath = hasQuery ? item.to.split("?")[0] : item.to;
              const itemSearch = hasQuery ? item.to.split("?")[1] : "";

              const isItemActive = hasQuery
                ? location.pathname === itemPath &&
                  (location.search === `?${itemSearch}` ||
                    (!location.search && itemSearch === "section=health"))
                : location.pathname === itemPath &&
                  (!location.search ||
                    !navItems.some(
                      (n) => n.to.includes(`${itemPath}?`) && location.search === `?${n.to.split("?")[1]}`,
                    ));

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  data-tour={(item as any).tour}
                  className={() =>
                    cn(
                      "flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-1.5 text-sm font-semibold transition-all duration-200",

                      isItemActive
                        ? item.danger
                          ? "bg-red-600 text-white shadow-sm"
                          : "bg-primary text-primary-foreground shadow-sm"
                        : item.danger
                          ? "bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700"
                          : "text-foreground hover:border-primary",
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  <span className="flex-1">{t(item.labelKey, item.label)}</span>
                  {item.label === "Notifications" && unreadCount > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-xs font-semibold text-destructive-foreground">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </NavLink>
              );
            })
          )}
        </nav>

        {/* Bottom Section - Account */}
        <div className="mt-auto px-2 pb-2">
          <AccountMenu
            align="start"
            alignOffset={0}
            trigger={
              <button className="flex w-full items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors">
                <Avatar className="h-[3.2rem] w-[3.2rem] border-2 border-primary">
                  <AvatarImage
                    key={profile?.avatar_url}
                    src={profile?.avatar_url || undefined}
                    alt={profile?.full_name || "User"}
                  />
                  <AvatarFallback className="bg-muted text-foreground text-base">
                    {profile?.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  {loading ? (
                    <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-foreground truncate">{profile?.full_name || t("nav.myProfile", "My Profile")}</p>
                      {mailboxAddress && (
                        <p
                          className="text-[11px] text-muted-foreground break-all leading-tight"
                          title={mailboxAddress}
                        >
                          {mailboxAddress}
                        </p>
                      )}

                    </>
                  )}
                </div>
              </button>
            }
          />
        </div>
      </div>
    </aside>
  );
}
