import { isWealthHidden } from "@/lib/terminology";
import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  MessageCircle,
  Settings2,
  Loader2,
  User,
  LucideIcon,
  DollarSign,
  UserPlus,
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
  TrendingUp as Activity,
  Sparkles,
  Lock,
  Briefcase as Stethoscope,
  History,
  BarChart3,
  FolderOpen as ClientFolder,
  Plug,
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
import { useSignatureBackfill } from "@/hooks/useSignatureBackfill";

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
  /** V2 preview feature the current account can't open (see useV2Demo). */
  v2Locked?: boolean;
}

interface NavSection {
  title: string;
  items: (NavItem & { tour?: string })[];
}

/** Doctors see one combined menu grouped under headings — "My Holarprac" for
 *  practice-facing tools, "My Holarchy" for their own profile — with SOS
 *  standalone above/below both, matching the heading pattern already used
 *  for hospital/ER provider sidebars. */
const DOCTOR_TOP_ITEMS: (NavItem & { tour?: string })[] = [];

const DOCTOR_SECTIONS: NavSection[] = [
  {
    title: "My Business",
    items: [
      { icon: LayoutDashboard, label: "My Dashboard", labelKey: "nav.dashboard", to: "/broker-dashboard", tour: "advisor-home" },
      { icon: Settings2, label: "My Business", labelKey: "nav.myPractice", to: "/business", tour: "practice-settings" },
      { icon: Clock, label: "My Shifts", labelKey: "nav.myShift", to: "/my-shift" },
      { icon: Users, label: "My Clients", labelKey: "nav.myPatients", to: "/clients", tour: "import-clients" },
      { icon: UserPlus, label: "Referrers", labelKey: "nav.referrers", to: "/referrers" },
      { icon: BedDouble, label: "Admissions", labelKey: "nav.admissions", to: "/admissions" },
      { icon: Stethoscope, label: "Consultations", labelKey: "nav.mySessions", to: "/sessions" },
      { icon: FolderOpen, label: "Documents", labelKey: "nav.allDocuments", to: "/documents" },
      { icon: Calendar, label: "My Calendar", labelKey: "nav.myCalendar", to: "/calendar" },
      { icon: Users2, label: "Round Tables", labelKey: "nav.myRoundTables", to: "/advisor/round-tables" },
      { icon: Plug, label: "App Integrations", labelKey: "nav.appIntegrations", to: "/app-integrations" },
    ],
  },
];


const DOCTOR_BOTTOM_ITEMS: (NavItem & { tour?: string })[] = [
  { icon: MessageCircle, label: "Messenger", labelKey: "nav.messenger", to: "/messenger" },
  { icon: Siren, label: "SOS", labelKey: "nav.sos", to: "/advisor/holarchelp", danger: true },
];


/** Flat view of the advisor menu, used for preference-based reordering/hiding
 *  and the "Customise menu" popover, which don't need to know about sections. */
const doctorModeItems: (NavItem & { tour?: string })[] = [
  ...DOCTOR_TOP_ITEMS,
  ...DOCTOR_SECTIONS.flatMap((s) => s.items),
  ...DOCTOR_BOTTOM_ITEMS,
];

/** Firm-facing screens a client must never see. */
const CLIENT_BLOCKED_PATHS = ["/business", "/clients"];

const patientNavItems: (NavItem & { tour?: string })[] = [
  { icon: LayoutDashboard, label: "My Dashboard", labelKey: "nav.myPersonalDashboard", to: "/my-dashboard" },
  { icon: Activity, label: "Live Workspace", labelKey: "nav.liveWorkspace", to: "/my-workspace" },
  { icon: User, label: "My Profile", labelKey: "nav.myProfile", to: "/client/details?section=health" },
  { icon: ClientFolder, label: "Documents", labelKey: "nav.clientDocuments", to: "/client/documents" },
  { icon: Calendar, label: "My Calendar", labelKey: "nav.myCalendar", to: "/calendar" },
  { icon: BedDouble, label: "My Admissions", labelKey: "nav.myAdmissions", to: "/client/admissions" },
  { icon: Sparkles, label: "Ask Holarc Wealth", labelKey: "nav.askMaeve", to: "/ask-maeve", accent: true },
  { icon: MessageCircle, label: "Messenger", labelKey: "nav.messenger", to: "/messenger" },
  { icon: Siren, label: "SOS", labelKey: "nav.sos", to: "/client/holarchelp", danger: true, tour: "client-sos" },
];

/** Referral Agents only need their own referral pipeline and earnings. */
const referrerNavItems: (NavItem & { tour?: string })[] = [
  { icon: UserPlus, label: "My Referrals", labelKey: "nav.myReferrals", to: "/referrer-dashboard" },
  { icon: DollarSign, label: "Brokers & Commission", labelKey: "nav.referrerCommissions", to: "/referrer-commissions" },
];

/** Extra tools for a Practice Management Assistant, appended to their own menu. */
const assistantNavItems: (NavItem & { tour?: string })[] = [
  { icon: Users, label: "Firm Clients", labelKey: "nav.practicePatients", to: "/firm-clients" },
  { icon: Calendar, label: "Firm Calendar", labelKey: "nav.practiceCalendar", to: "/calendar" },
  { icon: ListChecks, label: "Firm Actions", labelKey: "nav.practiceTasks", to: "/todos" },
];

const adminNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Home", labelKey: "nav.home", to: "/broker-dashboard" },
  { icon: Users, label: "Users", labelKey: "nav.users", to: "/admin/wealth-users" },
  { icon: BarChart3, label: "Performance", labelKey: "nav.performance", to: "/admin/performance" },
  { icon: DollarSign, label: "Pricing", labelKey: "nav.pricing", to: "/admin/pricing" },
  { icon: Plug, label: "Integrations", labelKey: "nav.integrationsAdmin", to: "/admin/integrations" },
  { icon: Siren, label: "SOS", labelKey: "nav.sos", to: "/client/holarchelp", danger: true },
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
  const { role, loading: roleLoading, isClient, isAdmin } = useUserRole();
  const { isAssistant } = usePracticeAssistant();
  const { hasHospitalAffiliation, loading: affiliationLoading } = useHospitalAffiliation();
  const { v2Demo } = useV2Demo();
  // Ensures a advisor's typed signature exists as a PNG for outbound email.
  useSignatureBackfill();

  const loading = roleLoading;
  const { profile } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();

  const isOnPatientRoute = location.pathname.startsWith("/client/");
  const isOnAdminRoute = location.pathname.startsWith("/admin");

  const mailboxAlias = (profile as any)?.mailbox_alias as string | null | undefined;
  const mailboxId = (profile as any)?.mailbox_id as string | null | undefined;
  const mailboxAddress = mailboxAlias
    ? `${mailboxAlias}@${INTAKE_EMAIL_DOMAIN}`
    : mailboxId
      ? `docs-${mailboxId.slice(0, 8)}@inbox.holarc.health`
      : "";

  // Advisors keep their own menu even when viewing client-scoped routes such as
  // "My Profile" (/client/details) — the route alone must not flip the nav.
  // While the role is still resolving we must NOT fall back to the route-based
  // guess, otherwise a advisor sees the client nav for one frame.
  const isAdvisor = role === "broker";
  const routeSaysPatient = isOnPatientRoute && !roleLoading && role !== null;

  /** Doctors can flip the sidebar between their professional menu and their
   *  own client menu with the badge next to the dashboard. Derived from the
   *  current route (rather than local state) so the active pill stays correct
   *  even if the sidebar remounts on navigation — local state was resetting
   *  to "broker" on every route change, leaving the pill stuck showing the
   *  wrong side as active. */
  const isOnMyDashboardRoute = location.pathname.startsWith("/my-dashboard");
  const profileMode: "broker" | "client" = (isOnPatientRoute || isOnMyDashboardRoute) ? "client" : "broker";

  const doctorInPatientMode = isAdvisor && profileMode === "client";

  const isPatientMenu =
    doctorInPatientMode ||
    (!isAdvisor && (isClient || routeSaysPatient));

  const isReferrerMenu = role === "referral_agent";
  const isDoctorMenu = !isOnAdminRoute && !isPatientMenu && !isReferrerMenu && !(isAdmin && isOnAdminRoute);

  /** Doctors only see "My Shifts" once they're attached to a hospital. */
  const hideMyShift = isDoctorMenu && (affiliationLoading || !hasHospitalAffiliation);

  /** Version 2.0 features (Ask Holarc) show for everyone as a greyed-out
   *  preview; only the system admin accounts (useV2Demo) can actually open them. */
  const V2_PATHS = ["/ask-maeve"];
  const withShiftRule = (items: (NavItem & { tour?: string })[]) => {
    let next = (hideMyShift ? items.filter((i) => i.to !== "/my-shift") : items).filter((i) => !isWealthHidden(i.to));
    if (!v2Demo) next = next.map((i) => (V2_PATHS.includes(i.to) ? { ...i, v2Locked: true } : i));
    return next;
  };

  const doctorItems = withShiftRule(doctorModeItems);
  const doctorSections = DOCTOR_SECTIONS.map((s) => ({ ...s, items: withShiftRule(s.items) }))
    .filter((s) => s.items.length > 0);

  const baseNav = isOnAdminRoute && isAdmin
    ? adminNavItems.filter((i) => !isWealthHidden(i.to))
    : isReferrerMenu
      ? referrerNavItems
      : isPatientMenu
      ? withShiftRule(patientNavItems).filter((i) => !CLIENT_BLOCKED_PATHS.includes(i.to))
      : doctorItems;



  // Practice Management Assistants keep their own (client) menu plus the
  // practice-admin tools they are responsible for.
  const withAssistant = isAssistant && !isOnAdminRoute
    ? [...baseNav.filter((i) => !assistantNavItems.some((a) => a.to === i.to)), ...assistantNavItems]
    : baseNav;

  // For admins not currently on an admin route, surface an "Admin" entry so
  // they can always reach the admin section.
  const navItems = isAdmin && !isOnAdminRoute
    ? [...withAssistant, { icon: UserCog, label: "Admin", labelKey: "nav.admin", to: "/admin/wealth-users" }]
    : withAssistant;

  const { preferences, savePreferences } = useSidebarPreferences();
  const visibleItems = (!isAdvisor || isOnAdminRoute)
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

    // "My Dashboard" is the universal post-login landing page (see
    // RoleBasedRedirect in App.tsx) but isn't itself a nav item — treat it as
    // the advisor Dashboard link's route too, so Dashboard highlights on landing
    // instead of nothing being highlighted at all.
    const isDashboardLandingAlias = itemPath === "/broker-dashboard" && location.pathname === "/my-dashboard";

    const isItemActive = isDashboardLandingAlias
      ? true
      : hasQuery
      ? location.pathname === itemPath &&
        (location.search === `?${itemSearch}` ||
          (!location.search && itemSearch === "section=health"))
      : location.pathname === itemPath &&
        (!location.search ||
          !navItems.some(
            (n) => n.to.includes(`${itemPath}?`) && location.search === `?${n.to.split("?")[1]}`,
          ));

    if (item.v2Locked) {
      return (
        <div
          key={item.to}
          className="flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-1.5 text-sm font-semibold text-white/40 cursor-not-allowed"
          title="Coming soon — preview only"
        >
          <item.icon className="h-5 w-5 text-white/40" />
          <span className="flex-1">{t(item.labelKey, item.label)}</span>
          <Lock className="h-3.5 w-3.5 shrink-0 text-white/40" />
        </div>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        data-tour={(item as any).tour}
        data-nav-documents={item.label === "Documents" && isPatientMenu ? true : undefined}
        className={() =>
          cn(
            "flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-1.5 text-sm font-semibold transition-all duration-200",
            isItemActive
              ? item.danger
                ? "bg-red-600 text-white shadow-sm"
                : item.accent
                  ? "bg-maeve-dark text-maeve-foreground shadow-sm"
                  : "bg-white text-black shadow-sm"
              : item.danger
                ? "bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700"
                : item.accent
                  ? "bg-maeve text-maeve-foreground border-maeve hover:bg-maeve-dark hover:border-maeve-dark"
                  : "text-white hover:bg-white/20",
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

  const { data: patientDocCount = 0, refetch: refetchPatientDocCount } = useQuery({
    queryKey: ["client-nav-doc-count"],
    enabled: isPatientMenu,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const sbx = supabase as any;
      const { data: client } = await sbx.from("clients").select("id")
        .or(`user_id.eq.${user.id},patient_user_id.eq.${user.id}`).maybeSingle();
      if (!client) return 0;
      const [{ count: docsCount }, { data: workflows }] = await Promise.all([
        sbx.from("documents").select("*", { count: "exact", head: true }).eq("patient_id", client.id).not("document_kind", "is", null),
        sbx.from("wealth_workflows").select("id").eq("patient_id", client.id),
      ]);
      let signedCount = 0;
      const workflowIds = (workflows ?? []).map((w: any) => w.id);
      if (workflowIds.length) {
        const { count } = await sbx.from("wealth_signed_documents").select("*", { count: "exact", head: true }).in("workflow_id", workflowIds);
        signedCount = count || 0;
      }
      return (docsCount || 0) + signedCount;
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!isPatientMenu) return;
    const handler = () => refetchPatientDocCount();
    window.addEventListener("wealth-doc-signed", handler);
    return () => window.removeEventListener("wealth-doc-signed", handler);
  }, [isPatientMenu, refetchPatientDocCount]);

  /** Advisor|Client pill shown next to Dashboard so a Wealth Manager can
   *  switch the sidebar between their professional tools and their own
   *  client profile. */
  const professionalMode = "broker";
  const professionalHome = "/broker-dashboard";
  const profileToggle = (
    <div className="mx-1 mt-1 flex items-center gap-1 rounded-full bg-muted/60 p-0.5">
      {([professionalMode, "client"] as const).map((mode) => {
        const isProfessional = mode !== "client";
        const active = isProfessional ? profileMode === "broker" : profileMode === "client";
        return (
          <button
            key={mode}
            type="button"
            onClick={() => {
              navigate(isProfessional ? professionalHome : "/my-dashboard");
              onNavigate?.();
            }}
            className={cn(
              "flex-1 rounded-full px-2.5 py-1 text-2xs font-semibold capitalize transition-colors",
              active
                ? "bg-sos text-sos-foreground"
                : "bg-neutral-400/60 text-white hover:bg-neutral-500",
            )}
          >
            {mode}
          </button>
        );
      })}
    </div>
  );

  return (

    <aside className="sidebar-chrome fixed left-0 top-0 z-40 h-screen w-[252px] bg-sidebar">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-center gap-3 px-6 pt-4 pb-2">
          <Logo size="nav" onDark className="[&_img]:!h-[9.3rem]" />
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
            <div className="space-y-1.5">

              {doctorInPatientMode && (
                <p className="mx-1 px-3 py-1.5 rounded-md bg-neutral-900 text-2xs font-bold uppercase tracking-[0.14em] text-white">
                  My Profile
                </p>
              )}
              {visibleItems.map((item) => renderNavLink(item))}
            </div>



          )}
        </nav>

        {/* Customise menu — doctors only */}
        {!loading && !isPatientMenu && !isOnAdminRoute && (
          <div className="px-4 pb-1">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors">
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

      </div>
    </aside>
  );
}
