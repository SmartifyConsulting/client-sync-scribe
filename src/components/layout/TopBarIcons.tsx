import { Bell, Mic, User, Settings, LogOut, Award, Share2, Stethoscope, HeartPulse, Calendar as CalendarIcon, Gift, Bug, Scale, UserCog, ShieldCheck, Loader2 } from "lucide-react";
import { TEST_PROFILES, ADMIN_EMAIL } from "./testProfiles";
import { useImpersonate } from "./useImpersonate";
import { useEffect, useState } from "react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "sonner";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { ShareAppDialog } from "@/components/ShareAppDialog";
import { ReportFixSheet } from "@/components/feedback/ReportFixSheet";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { AccountMenu } from "./AccountMenu";

const PROVIDER_PROFILE_NOTIF_TYPES = [
  "access_request",
  "access_accepted",
  "access_revoked",
  "invitation_received",
  "appointment_request",
  "appointment_accepted",
  "document_received",
];

export interface TopBarIconsProps {
  variant?: "default" | "provider";
}

export function TopBarIcons({ variant = "default" }: TopBarIconsProps = {}) {
  const { t } = useTranslation();
  const isProvider = variant === "provider";
  const [reportOpen, setReportOpen] = useState(false);
  const { profile } = useProfile();
  const { isDoctor, isEmergency } = useUserRole();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const isOnPatientRoute = location.pathname.startsWith("/patient/");
  const { isAdmin } = useIsAdmin();
  const [seeded, setSeeded] = useState(false);
  const { impersonate, switching } = useImpersonate();

  const { data: currentEmail = "" } = useQuery({
    queryKey: ["auth-email-topbar"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return (user?.email || "").toLowerCase();
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!isAdmin || seeded) return;
    setSeeded(true);
    supabase.functions.invoke("admin-seed-test-users").catch(() => {});
  }, [isAdmin, seeded]);

  const { data: unreadNotifCount = 0 } = useQuery({
    queryKey: ["unread-notifications-topbar", variant],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      let q = supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (isProvider) q = q.in("type", PROVIDER_PROFILE_NOTIF_TYPES);
      const { count } = await q;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const { data: recentNotifications = [] } = useQuery({
    queryKey: ["recent-notifications-topbar", variant],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      let q = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);
      if (isProvider) q = q.in("type", PROVIDER_PROFILE_NOTIF_TYPES);
      const { data } = await q;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: totalCpdPoints = 0 } = useQuery({
    queryKey: ["cpd-points-topbar"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { data } = await supabase
        .from("cpd_certificates")
        .select("cpd_points")
        .eq("user_id", user.id);
      if (!data) return 0;
      return data.reduce((sum, cert) => sum + (cert.cpd_points || 0), 0);
    },
    refetchInterval: 60000,
  });

  const clearAllNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    queryClient.invalidateQueries({ queryKey: ["unread-notifications-topbar"] });
    queryClient.invalidateQueries({ queryKey: ["recent-notifications-topbar"] });
  };

  const clearNotification = async (notifId: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", notifId);
    queryClient.invalidateQueries({ queryKey: ["unread-notifications-topbar"] });
    queryClient.invalidateQueries({ queryKey: ["recent-notifications-topbar"] });
  };

  const getInitials = () => {
    if (!profile?.full_name) return "U";
    return profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Language switcher — sits immediately left of the bug-report icon */}
      <LanguageSwitcher />

      {/* Bug/Fix Report */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setReportOpen(true)}
              className="h-9 w-9 rounded-full bg-green-600 flex items-center justify-center hover:opacity-80 transition-opacity"
            >
              <Bug className="h-4 w-4 text-white" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t("topbar.reportBug")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ReportFixSheet open={reportOpen} onOpenChange={setReportOpen} />

      {!isProvider && (
        <>
          {/* Calendar quick-access */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to={isOnPatientRoute ? "/patient/calendar" : "/calendar"}>
                  <div className="h-9 w-9 rounded-full bg-terracotta flex items-center justify-center hover:bg-terracotta-dark transition-colors">
                    <CalendarIcon className="h-4 w-4 text-white" />
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent>{t("topbar.calendar")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Mic */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/todos?autoRecord=true">
                  <div className="h-9 w-9 rounded-full bg-terracotta flex items-center justify-center hover:bg-terracotta-dark transition-colors">
                    <Mic className="h-4 w-4 text-white stroke-white fill-none" />
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent>{t("topbar.recordTask")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}

      {/* Bell */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="relative h-9 w-9 rounded-full bg-terracotta flex items-center justify-center hover:bg-terracotta-dark transition-colors">
            <Bell className="h-4 w-4 text-white stroke-white fill-none" />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold text-white">
                {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="end">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold">{t("topbar.notifications")}</p>
            {recentNotifications.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-6 text-destructive hover:text-destructive" onClick={clearAllNotifications}>
                {t("topbar.clearAll")}
              </Button>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">{t("topbar.noNotifications")}</p>
            ) : (
              recentNotifications.map((n: any) => (
                <div key={n.id} className="px-3 py-2 border-b border-border/50 text-xs bg-primary/5 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{n.title}</p>
                    {n.description && <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>}
                  </div>
                  <Button variant="ghost" size="sm" className="h-5 px-1 text-[9px] text-muted-foreground hover:text-destructive shrink-0" onClick={() => clearNotification(n.id)}>
                    {t("common.close")}
                  </Button>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

    </div>
  );
}