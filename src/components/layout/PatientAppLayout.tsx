import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Calendar, Clock, LogOut, User, Bell, Mic } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageTransition } from "./PageTransition";
import { AnimatePresence } from "framer-motion";
import { useSubscriptionGate } from "@/hooks/useSubscriptionGate";
import { SubscriptionGateModal } from "@/components/auth/SubscriptionGateModal";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, addDays } from "date-fns";
import holarcLogo from "@/assets/holarc-logo.png";

export function PatientAppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isBlocked, daysRemaining, loading } = useSubscriptionGate();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const isSettingsPage = location.pathname.startsWith("/settings");

  const getInitials = () => {
    if (!profile?.full_name) return "U";
    return profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Upcoming appointments (next 2 weeks)
  const { data: upcomingAppointments = [] } = useQuery({
    queryKey: ["patient-upcoming-appointments-topbar"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const now = new Date().toISOString();
      const twoWeeks = addDays(new Date(), 14).toISOString();
      const { data } = await supabase
        .from("appointments")
        .select("*")
        .gte("start_time", now)
        .lte("start_time", twoWeeks)
        .order("start_time", { ascending: true })
        .limit(5);
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Notifications
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!loading && isBlocked && !isSettingsPage && <SubscriptionGateModal />}

      {!loading && !isBlocked && daysRemaining !== null && daysRemaining <= 7 && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-xs text-amber-700 flex items-center justify-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" />
          Your free access ends in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}. Subscribe in Settings to continue using the app.
        </div>
      )}

      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="px-4 md:px-8 py-3 flex items-center justify-between max-w-7xl mx-auto w-full">
          {/* Left: Logo */}
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={holarcLogo} alt="Holarc" className="h-11 w-auto object-contain" />
          </button>

          {/* Center: Upcoming Appointments */}
          <div className="hidden md:flex items-center gap-3">
            {upcomingAppointments.length > 0 ? (
              <button
                onClick={() => navigate("/patient/calendar")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors border border-primary/20"
              >
                <Calendar className="h-4 w-4 text-primary" />
                <div className="flex items-center gap-3">
                  {upcomingAppointments.slice(0, 3).map((apt: any) => (
                    <div key={apt.id} className="flex items-center gap-1.5 text-xs">
                      <span className="font-medium text-foreground">{apt.title}</span>
                      <span className="text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(apt.start_time), "MMM d, h:mm a")}
                      </span>
                    </div>
                  ))}
                  {upcomingAppointments.length > 3 && (
                    <Badge variant="secondary" className="text-[10px]">+{upcomingAppointments.length - 3} more</Badge>
                  )}
                </div>
              </button>
            ) : (
              <button
                onClick={() => navigate("/patient/calendar")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
              >
                <Calendar className="h-4 w-4" />
                No upcoming appointments
              </button>
            )}
          </div>

          {/* Right: Mic, Bell, Avatar */}
          <div className="flex items-center gap-2">
            {/* Mobile upcoming indicator */}
            <div className="md:hidden">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => navigate("/patient/calendar")}
                      className="relative h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                    >
                      <Calendar className="h-4 w-4 text-primary" />
                      {upcomingAppointments.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[8px] font-bold text-primary-foreground">
                          {upcomingAppointments.length}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Upcoming Appointments</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Mic */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate("/todos?autoRecord=true")}
                    className="h-9 w-9 rounded-full bg-terracotta flex items-center justify-center hover:bg-terracotta-dark transition-colors"
                  >
                    <Mic className="h-4 w-4 text-white stroke-white fill-none" />
                  </button>
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

            {/* Avatar with Sign Out */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="rounded-xl p-1 hover:bg-accent transition-colors">
                  <Avatar className="h-9 w-9 border-2 border-primary">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1.5" align="end">
                <div className="px-2 py-1.5 border-b border-border mb-1">
                  <p className="text-xs font-semibold text-foreground">{profile?.full_name || "User"}</p>
                  <p className="text-[10px] text-muted-foreground">Patient</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-destructive/10 text-destructive transition-colors w-full"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign Out
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="px-4 py-6 md:px-8 md:pt-6 md:pb-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
