import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import holarcLogoAsset from "@/assets/holarc-health-logo.png.asset.json";
const holarcLogo = holarcLogoAsset.url;
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings2,
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
  SlidersHorizontal,
  Clock,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  RotateCcw,
  FlaskConical,
  Activity,
  Sparkles,
} from "lucide-react";

import { useUserRole } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { useSidebarPreferences } from "@/hooks/useSidebarPreferences";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePracticeAssistant } from "@/hooks/usePracticeAssistant";
import { useHospitalAffiliation } from "@/hooks/useHospitalAffiliation";
import { useV2Demo } from "@/hooks/useV2Demo";

import { AccountMenu } from "@/components/layout/AccountMenu";
import { INTAKE_EMAIL_DOMAIN } from "@/lib/mailboxDomain";

interface NavItem {
  icon: LucideIcon;
  label: string;
  labelKey: string;
  to: string;
  danger?: boolean;
  /** Ask Holarc — yellow-orange accent, distinct from the red SOS control. */
  accent?: boolean;
}

interface NavSection {
  title: string;
  items: (NavItem & { tour?: string })[];
}

/** Doctors see one combined menu grouped under headings — "My Holarprac" for
 *  practice-facing tools, "My Holarchy" for their own profile — with SOS
 *  standalone above/below both, matching the heading pattern already used
 *  for hospital/ER provider sidebars. */
const DOCTOR_TOP_ITEMS: (NavItem & { tour?: string })[] = [
  { icon: LayoutDashboard, label: "Dashboard", labelKey: "nav.dashboard", to: "/doctor-dashboard", tour: "doctor-home" },
];

const DOCTOR_SECTIONS: NavSection[] = [
  {
    title: "My Holarprac",
    items: [
      { icon: Settings2, label: "My Practice", labelKey: "nav.myPractice", to: "/practice", tour: "practice-settings" },
      { icon: Clock, label: "My Shifts", labelKey: "nav.myShift", to: "/my-shift" },
      { icon: Calendar, label: "My Calendar", labelKey: "nav.myCalendar", to: "/calendar" },
      { icon: ListChecks, label: "My Tasks", labelKey: "nav.myTasks", to: "/todos", tour: "doctor-tasks" },
    ],
  },
  {
    title: "My Patients",
    items: [
      { icon: Users, label: "My Patients", labelKey: "nav.myPatients", to: "/patients", tour: "import-patients" },
      { icon: BedDouble, label: "Admissions", labelKey: "nav.admissions", to: "/admissions" },
      { icon: Mic, label: "Sessions", labelKey: "nav.mySessions", to: "/my-sessions" },
      { icon: Activity, label: "My Biolog", labelKey: "nav.myBiolog", to: "/biolog" },
      { icon: FolderOpen, label: "Documents", labelKey: "nav.allDocuments", to: "/documents" },
      { icon: Users2, label: "Round Tables", labelKey: "nav.myRoundTables", to: "/doctor/round-tables" },
    ],
  },
  {
    title: "My Holarchy",
    items: [
      { icon: LayoutDashboard, label: "My Dashboard", labelKey: "nav.myPersonalDashboard", to: "/my-dashboard" },
      { icon: User, label: "My Profile", labelKey: "nav.myProfile", to: "/patient/details?section=health" },
      { icon: Gift, label: "My Rewards", labelKey: "nav.myRewards", to: "/doctor/rewards" },
    ],
  },
];

const DOCTOR_BOTTOM_ITEMS: (NavItem & { tour?: string })[] = [
  { icon: Sparkles, label: "Ask Holarc", labelKey: "nav.askMaeve", to: "/ask-maeve", accent: true },
  { icon: Siren, label: "SOS", labelKey: "nav.sos", to: "/doctor/holarchelp", danger: true },
];

/** Flat view of the doctor menu, used for preference-based reordering/hiding
 *  and the "Customise menu" popover, which don't need to know about sections. */
const doctorModeItems: (NavItem & { tour?: string })[] = [
  ...DOCTOR_TOP_ITEMS,
  ...DOCTOR_SECTIONS.flatMap((s) => s.items),
  ...DOCTOR_BOTTOM_ITEMS,
];

const patientNavItems: (NavItem & { tour?: string })[] = [
  { icon: LayoutDashboard, label: "My Dashboard", labelKey: "nav.myPersonalDashboard", to: "/my-dashboard" },
  { icon: Users, label: "My Profile", labelKey: "nav.myHolarchy", to: "/patient/details?section=health", tour: "patient-holarchy" },
  { icon: Activity, label: "My Biolog", labelKey: "nav.myBiolog", to: "/biolog" },
  { icon: BedDouble, label: "My Admissions", labelKey: "nav.myAdmissions", to: "/patient/admissions" },
  { icon: Calendar, label: "My Calendar", labelKey: "nav.myCalendar", to: "/patient/calendar" },
  { icon: ListChecks, label: "My Tasks", labelKey: "nav.myTasks", to: "/patient/tasks", tour: "patient-tasks" },
  { icon: FolderOpen, label: "My Documents", labelKey: "nav.myDocuments", to: "/patient/documents" },
  { icon: FlaskConical, label: "Lab Results", labelKey: "nav.labResults", to: "/patient/lab-results" },
  { icon: Gift, label: "My Rewards", labelKey: "nav.myRewards", to: "/patient/rewards" },
  { icon: Sparkles, label: "Ask Holarc", labelKey: "nav.askMaeve", to: "/ask-maeve", accent: true },
  { icon: Siren, label: "SOS", labelKey: "nav.sos", to: "/patient/holarchelp", danger: true, tour: "patient-sos" },
];

/** Nurses on duty get a lean menu focused on their shift and their patients. */
const nurseNavItems: (NavItem & { tour?: string })[] = [
  { icon: LayoutDashboard, label: "My Dashboard", labelKey: "nav.myPersonalDashboard", to: "/my-dashboard" },
  { icon: Clock, label: "My Shifts", labelKey: "nav.myShift", to: "/my-shift" },
  { icon: Users, label: "My Patients", labelKey: "nav.myPatients", to: "/provider/hospital/inpatients" },
  { icon: User, label: "My Profile", labelKey: "nav.myProfile", to: "/patient/details?section=health" },
  { icon: Sparkles, label: "Ask Holarc", labelKey: "nav.askMaeve", to: "/ask-maeve", accent: true },
  { icon: Siren, label: "SOS", labelKey: "nav.sos", to: "/patient/holarchelp", danger: true },
];

/** Extra tools for a Practice Management Assistant, appended to their own menu. */
const assistantNavItems: (NavItem & { tour?: string })[] = [
  { icon: Users, label: "Practice Patients", labelKey: "nav.practicePatients", to: "/practice-patients" },
  { icon: Calendar, label: "Practice Calendar", labelKey: "nav.practiceCalendar", to: "/calendar" },
  { icon: ListChecks, label: "Practice Tasks", labelKey: "nav.practiceTasks", to: "/todos" },
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

/** Sorts+filters a flat item list by the saved preferences — order entries that don't
 *  belong to this list are simply ignored, so practice/profile ordering never collides. */
function applyItemPreferences(
  items: (NavItem & { tour?: string })[],
  order: string[],
  hidden: string[],
): (NavItem & { tour?: string })[] {
  const ordered = order.length
    ? [...items].sort((a, b) => {
        const ia = order.indexOf(a.to);
        const ib = order.indexOf(b.to);
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      })
    : items;
  return ordered.filter((i) => !hidden.includes(i.to));
}

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { t } = useTranslation();
  const { role, loading: roleLoading, isPatient, isAdmin } = useUserRole();
  const { isAssistant } = usePracticeAssistant();
  const { hasHospitalAffiliation, loading: affiliationLoading } = useHospitalAffiliation();
  const { v2Demo } = useV2Demo();

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
  const isNurseMenu = role === "nurse";
  const routeSaysPatient = isOnPatientRoute && !roleLoading && role !== null;
  const isPatientMenu = !isDoctor && !isNurseMenu && (isPatient || routeSaysPatient);

  const isDoctorMenu = !isOnAdminRoute && !isPatientMenu && !isNurseMenu && !(isAdmin && isOnAdminRoute);

  /** Doctors only see "My Shifts" once they're attached to a hospital. */
  const hideMyShift = isDoctorMenu && (affiliationLoading || !hasHospitalAffiliation);
  /** Version 2.0 features stay hidden unless the account is a v2 demo profile. */
  const V2_PATHS = ["/biolog", "/ask-maeve"];
  const withShiftRule = (items: (NavItem & { tour?: string })[]) => {
    let next = hideMyShift ? items.filter((i) => i.to !== "/my-shift") : items;
    if (!v2Demo) next = next.filter((i) => !V2_PATHS.includes(i.to));
    return next;
  };

  const doctorItems = withShiftRule(doctorModeItems);
  const doctorSections = DOCTOR_SECTIONS.map((s) => ({ ...s, items: withShiftRule(s.items) }))
    .filter((s) => s.items.length > 0);

  const baseNav = isOnAdminRoute && isAdmin
    ? adminNavItems
    : isNurseMenu
      ? withShiftRule(nurseNavItems)
      : isPatientMenu
      ? withShiftRule(patientNavItems)
      : doctorItems;



  // Practice Management Assistants keep their own (patient) menu plus the
  // practice-admin tools they are responsible for.
  const withAssistant = isAssistant && !isOnAdminRoute
    ? [...baseNav.filter((i) => !assistantNavItems.some((a) => a.to === i.to)), ...assistantNavItems]
    : baseNav;

  // For admins not currently on an admin route, surface an "Admin" entry so
  // they can always reach the admin section.
  const navItems = isAdmin && !isOnAdminRoute
    ? [...withAssistant, { icon: UserCog, label: "Admin", labelKey: "nav.admin", to: "/admin/users" }]
    : withAssistant;

  const { preferences, savePreferences } = useSidebarPreferences();
  const visibleItems = (!isDoctor || isOnAdminRoute)
    ? navItems
    : applyItemPreferences(navItems, preferences.item_order, preferences.hidden_items);

  const moveItem = (modeItems: (NavItem & { tour?: string })[], to: string, direction: -1 | 1) => {
    const modeTos = modeItems.map((i) => i.to);
    const currentOrder = preferences.item_order.filter((t) => modeTos.includes(t));
    const base = currentOrder.length ? currentOrder : modeTos;
    const idx = base.indexOf(to);
    if (idx === -1) return;
    const swapWith = idx + direction;
    if (swapWith < 0 || swapWith >= base.length) return;
    const next = [...base];
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    const others = preferences.item_order.filter((t) => !modeTos.includes(t));
    savePreferences({ ...preferences, item_order: [...others, ...next] });
  };

  const toggleHidden = (to: string) => {
    const isHidden = preferences.hidden_items.includes(to);
    const next = isHidden
      ? preferences.hidden_items.filter((h) => h !== to)
      : [...preferences.hidden_items, to];
    savePreferences({ ...preferences, hidden_items: next });
  };

  const restoreAll = () => savePreferences({ item_order: [], hidden_items: [] });

  const renderNavLink = (item: NavItem & { tour?: string }) => {
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
                : item.accent
                  ? "bg-maeve-dark text-maeve-foreground shadow-sm"
                  : "bg-primary text-primary-foreground shadow-sm"
              : item.danger
                ? "bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700"
                : item.accent
                  ? "bg-maeve text-maeve-foreground border-maeve hover:bg-maeve-dark hover:border-maeve-dark"
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
  };

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
        <nav className="flex-1 px-4 pt-[1.5cm] py-1 space-y-4 overflow-y-auto font-size-preserve">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : isDoctorMenu ? (
            <>
              <div className="space-y-1.5">
                {applyItemPreferences(DOCTOR_TOP_ITEMS, preferences.item_order, preferences.hidden_items).map((item) =>
                  renderNavLink(item),
                )}
              </div>
              {doctorSections.map((section) => {
                const sectionItems = applyItemPreferences(section.items, preferences.item_order, preferences.hidden_items);
                if (sectionItems.length === 0) return null;
                return (
                  <div key={section.title} className="space-y-1.5">
                    <p className="mx-1 px-3 py-1.5 rounded-md bg-neutral-600 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                      {section.title}
                    </p>
                    {sectionItems.map((item) => renderNavLink(item))}
                  </div>
                );
              })}
              <div className="space-y-1.5">
                {applyItemPreferences(withShiftRule(DOCTOR_BOTTOM_ITEMS), preferences.item_order, preferences.hidden_items).map((item) =>
                  renderNavLink(item),
                )}

              </div>
            </>
          ) : (
            <div className="space-y-1.5">{visibleItems.map((item) => renderNavLink(item))}</div>
          )}
        </nav>

        {/* Customise menu — doctors only */}
        {!loading && !isPatientMenu && !isNurseMenu && !isOnAdminRoute && (
          <div className="px-4 pb-1">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Customise menu
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-72 max-h-[70vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-foreground">Customise menu</p>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={restoreAll}>
                    <RotateCcw className="h-3 w-3" /> Restore all
                  </Button>
                </div>
                <div className="space-y-1">
                  {doctorItems.map((item, i) => {
                    const isHidden = preferences.hidden_items.includes(item.to);
                    return (
                      <div key={item.to} className="flex items-center justify-between gap-1 rounded-lg px-2 py-1.5 hover:bg-muted/50">
                        <span className={cn("text-xs", isHidden && "text-muted-foreground line-through")}>
                          {t(item.labelKey, item.label)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            className="p-1 rounded hover:bg-muted disabled:opacity-30"
                            disabled={i === 0}
                            onClick={() => moveItem(doctorItems, item.to, -1)}
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="p-1 rounded hover:bg-muted disabled:opacity-30"
                            disabled={i === doctorItems.length - 1}
                            onClick={() => moveItem(doctorItems, item.to, 1)}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <button className="p-1 rounded hover:bg-muted" onClick={() => toggleHidden(item.to)}>
                            {isHidden ? (
                              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <Eye className="h-3.5 w-3.5 text-primary" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

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
