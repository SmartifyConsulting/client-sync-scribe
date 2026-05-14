import { Bell, Mic, User, Settings, LogOut, Award, Share2, Stethoscope, HeartPulse, Calendar as CalendarIcon, Gift, Bug, Scale, UserCog, Ambulance, Building2, ShieldCheck, Loader2 } from "lucide-react";
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

export function TopBarIcons() {
  const [reportOpen, setReportOpen] = useState(false);
  const { profile } = useProfile();
  const { isDoctor } = useUserRole();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const isOnPatientRoute = location.pathname.startsWith("/patient/");
  const { isAdmin } = useIsAdmin();
  const [switching, setSwitching] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  const TEST_PROFILES: Array<{ email: string; name: string; role: string; icon: any }> = [
    { email: "info@georgiaadams.co.za", name: "Georgia Adams", role: "Admin", icon: ShieldCheck },
    { email: "sme@smartify.co.za", name: "Dean Allie", role: "Doctor", icon: Stethoscope },
    { email: "dean.allie@gmail.com", name: "Dean Allie", role: "Patient", icon: HeartPulse },
    { email: "projectmanager@smartify.co.za", name: "Shannon Kennedy", role: "Patient", icon: HeartPulse },
    { email: "paraskevoulasoldatos@gmail.com", name: "Paraskevi Soldatos", role: "Patient", icon: HeartPulse },
    { email: "xtina@smartify.co.za", name: "Xtina", role: "Doctor", icon: Stethoscope },
    { email: "zano@smartify.co.za", name: "Zano", role: "Hospital", icon: Building2 },
    { email: "renken@smartify.co.za", name: "Renken", role: "Ambulance", icon: Ambulance },
  ];
  const currentEmail = (profile as any)?.email || "";

  useEffect(() => {
    if (!isAdmin || seeded) return;
    setSeeded(true);
    supabase.functions.invoke("admin-seed-test-users").catch(() => {});
  }, [isAdmin, seeded]);

  async function impersonate(email: string) {
    if (switching) return;
    setSwitching(email);
    try {
      const { data, error } = await supabase.functions.invoke("admin-impersonate", { body: { email } });
      if (error || !data?.token_hash) throw new Error(error?.message || data?.error || "Failed");
      await supabase.auth.signOut();
      const { error: vErr } = await supabase.auth.verifyOtp({ email, token_hash: data.token_hash, type: "magiclink" });
      if (vErr) throw vErr;
      toast.success(`Signed in as ${email}`);
      window.location.href = "/";
    } catch (e: any) {
      toast.error(`Switch failed: ${e.message}`);
      setSwitching(null);
    }
  }

  const { data: unreadNotifCount = 0 } = useQuery({
    queryKey: ["unread-notifications-topbar"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const { data: recentNotifications = [] } = useQuery({
    queryKey: ["recent-notifications-topbar"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);
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
      {/* Bug/Fix Report */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setReportOpen(true)}
              className="h-9 w-9 rounded-full bg-green-600 flex items-center justify-center hover:bg-green-700 transition-colors"
            >
              <Bug className="h-4 w-4 text-white" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Report Bug/Fix</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ReportFixSheet open={reportOpen} onOpenChange={setReportOpen} />

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
          <TooltipContent>Calendar</TooltipContent>
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
          <TooltipContent>Record a Task</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Bell */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="relative h-9 w-9 rounded-full bg-terracotta flex items-center justify-center hover:bg-terracotta-dark transition-colors">
            <Bell className="h-4 w-4 text-white stroke-white fill-none" />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[8px] font-bold text-white">
                {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="end">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold">Notifications</p>
            {recentNotifications.length > 0 && (
              <Button variant="ghost" size="sm" className="text-[10px] h-6 text-destructive hover:text-destructive" onClick={clearAllNotifications}>
                Clear All
              </Button>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No notifications</p>
            ) : (
              recentNotifications.map((n: any) => (
                <div key={n.id} className="px-3 py-2 border-b border-border/50 text-xs bg-primary/5 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{n.title}</p>
                    {n.description && <p className="text-[10px] text-muted-foreground mt-0.5">{n.description}</p>}
                  </div>
                  <Button variant="ghost" size="sm" className="h-5 px-1 text-[9px] text-muted-foreground hover:text-destructive shrink-0" onClick={() => clearNotification(n.id)}>
                    Clear
                  </Button>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Avatar */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="rounded-xl p-1 hover:bg-accent transition-colors relative">
            <Avatar className="h-9 w-9 border-2 border-primary">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            {isDoctor && totalCpdPoints > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 text-[8px] bg-amber-500 hover:bg-amber-500 text-white border-2 border-background">
                <Award className="h-2 w-2 mr-0.5" />
                {totalCpdPoints}
              </Badge>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1.5" align="end">
          {/* Profile switcher */}
          {isDoctor && (
            <div className="border-b border-border mb-1">
              <button
                onClick={() => { if (isOnPatientRoute) navigate("/dashboard"); }}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 w-full rounded-md transition-colors",
                  !isOnPatientRoute ? "bg-primary/10" : "hover:bg-accent"
                )}
              >
                <Stethoscope className="h-3.5 w-3.5 text-primary" />
                <div className="text-left">
                  <p className="text-xs font-semibold text-foreground">{profile?.full_name || "User"}</p>
                  <p className="text-[10px] text-muted-foreground">Doctor</p>
                </div>
              </button>
              <button
                onClick={() => navigate("/patient/details")}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 w-full rounded-md transition-colors",
                  isOnPatientRoute ? "bg-primary/10" : "hover:bg-accent"
                )}
              >
                <HeartPulse className="h-3.5 w-3.5 text-primary" />
                <div className="text-left">
                  <p className="text-xs font-semibold text-foreground">{profile?.full_name || "User"}</p>
                  <p className="text-[10px] text-muted-foreground">Patient</p>
                </div>
              </button>
            </div>
          )}
          {!isDoctor && (
            <div className="px-2 py-1.5 border-b border-border mb-1">
              <p className="text-xs font-semibold text-foreground">{profile?.full_name || "User"}</p>
              <p className="text-[10px] text-muted-foreground capitalize">Patient</p>
            </div>
          )}
          {isDoctor && !isOnPatientRoute && (
            <Link to="/doctor/rewards" className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-accent transition-colors">
              <Gift className="h-3.5 w-3.5" /> My Rewards
            </Link>
          )}
          {isAdmin && (
            <div className="border-t border-border mt-1 pt-1">
              <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <UserCog className="h-3 w-3" /> Switch profile (admin)
              </div>
              <div className="max-h-64 overflow-y-auto">
                {TEST_PROFILES.map((p) => {
                  const Icon = p.icon;
                  const isCurrent = currentEmail.toLowerCase() === p.email;
                  const isLoading = switching === p.email;
                  return (
                    <button
                      key={p.email}
                      onClick={() => !isCurrent && impersonate(p.email)}
                      disabled={isCurrent || !!switching}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 w-full rounded-md transition-colors text-left",
                        isCurrent ? "bg-primary/10 cursor-default" : "hover:bg-accent",
                        switching && !isLoading && "opacity-50",
                      )}
                    >
                      {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <Icon className="h-3.5 w-3.5 text-primary shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{p.role} · {p.email}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <Link to="/settings" className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-accent transition-colors">
            <Settings className="h-3.5 w-3.5" /> Settings
          </Link>
          <Link to="/legal" className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-accent transition-colors">
            <Scale className="h-3.5 w-3.5" /> Legal Terms
          </Link>
          <ShareAppDialog trigger={
            <button className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-accent transition-colors w-full">
              <Share2 className="h-3.5 w-3.5" /> Share App
            </button>
          } />
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }} className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-destructive/10 text-destructive transition-colors w-full">
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}