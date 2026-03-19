import { Users, Calendar, TrendingUp, LogOut, Award, Bell, Mic, User, Settings, Star } from "lucide-react";
import { CompactTodoList } from "@/components/dashboard/CompactTodoList";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { TodaysBriefing } from "@/components/dashboard/TodaysBriefing";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { DoctorAccessRequests } from "@/components/doctor/DoctorAccessRequests";
import { useProfile } from "@/hooks/useProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function Dashboard() {
  const { profile, loading: profileLoading } = useProfile();
  const { isDoctor, loading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();

  // Query for unread notifications count (invitations + document receipts only)
  const { data: unreadNotifCount = 0 } = useQuery({
    queryKey: ["unread-notifications-dashboard"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
        .in("type", ["invitation", "document", "document_received", "connection_request", "reward", "streak"]);

      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  // Query for recent notifications
  const { data: recentNotifications = [] } = useQuery({
    queryKey: ["recent-notifications-dashboard"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) return [];
      return data || [];
    },
    refetchInterval: 30000,
  });

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    queryClient.invalidateQueries({ queryKey: ["unread-notifications-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["recent-notifications-dashboard"] });
  };

  // Query for unread messages count
  const { data: unreadMessagesCount = 0 } = useQuery({
    queryKey: ["unread-messages-dashboard"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
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

  // Query for pending todos count
  const { data: pendingTodosCount = 0 } = useQuery({
    queryKey: ["pending-todos-dashboard"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from("todos")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending");

      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  // Query for total CPD points
  const { data: totalCpdPoints = 0 } = useQuery({
    queryKey: ["cpd-points-dashboard"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data, error } = await supabase
        .from("cpd_certificates")
        .select("cpd_points")
        .eq("user_id", user.id);

      if (error) return 0;
      return data.reduce((sum, cert) => sum + (cert.cpd_points || 0), 0);
    },
    refetchInterval: 60000,
  });

  // Query for doctor average rating
  const { data: avgRating = 0 } = useQuery({
    queryKey: ["doctor-avg-rating"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { data, error } = await supabase
        .from("visit_ratings")
        .select("rating")
        .eq("rated_user_id", user.id);
      if (error || !data || data.length === 0) return 0;
      return data.reduce((sum, r) => sum + r.rating, 0) / data.length;
    },
    refetchInterval: 60000,
  });

  // Query for doctor moolas (from doctor_rewards)
  const { data: doctorMoolas = 0 } = useQuery({
    queryKey: ["doctor-moolas-dashboard"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { data, error } = await supabase
        .from("doctor_rewards")
        .select("moolas_count")
        .eq("doctor_id", user.id);
      if (error || !data) return 0;
      return data.reduce((sum, r) => sum + (r.moolas_count || 0), 0);
    },
    refetchInterval: 60000,
  });

  // Query for patient moolas (from patient_rewards where patient is linked to this user)
  const { data: patientMoolas = 0 } = useQuery({
    queryKey: ["patient-moolas-dashboard"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      // Find patient record linked to this user
      const { data: patient } = await supabase
        .from("patients")
        .select("id")
        .eq("patient_user_id", user.id)
        .maybeSingle();
      if (!patient) return 0;
      const { data: rewards, error } = await supabase
        .from("patient_rewards")
        .select("lollipops_count")
        .eq("patient_id", patient.id);
      if (error || !rewards) return 0;
      return rewards.reduce((sum, r) => sum + (r.lollipops_count || 0), 0);
    },
    refetchInterval: 60000,
  });
  
  // Format display name based on role - return empty string while loading
  const getDisplayName = () => {
    if (profileLoading || roleLoading) return '';
    if (!profile?.full_name) return isDoctor ? 'Doctor' : '';
    
    const nameParts = profile.full_name.split(' ');
    if (isDoctor) {
      // For doctors: "Dr. [Surname]"
      const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
      return `Dr. ${surname}`;
    } else {
      // For patients: First name
      return nameParts[0];
    }
  };

  const getInitials = () => {
    if (!profile?.full_name) return "U";
    const names = profile.full_name.split(" ");
    return names.map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  // Get time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  
  // Format today's date
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with Profile */}
      <div className="flex items-start justify-between pb-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{greeting}, {getDisplayName()}</h1>
          <p className="mt-2 text-muted-foreground text-[12px]">
            Here's what's happening with your practice today, {formattedDate}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Record a Task Shortcut */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/todos?autoRecord=true">
                  <div className="h-10 w-10 rounded-full bg-terracotta flex items-center justify-center hover:bg-terracotta-dark transition-colors">
                    <Mic className="h-5 w-5 text-white stroke-white fill-none" />
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Record a Task</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {/* Notification Bell */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative h-10 w-10 rounded-full bg-terracotta flex items-center justify-center hover:bg-terracotta-dark transition-colors">
                <Bell className="h-5 w-5 text-white stroke-white fill-none" />
                 {unreadNotifCount > 0 && (
                   <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                     {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                   </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold">Notifications</p>
                {unreadNotifCount > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
                    Mark all read
                  </Button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {recentNotifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No notifications</p>
                ) : (
                  recentNotifications.map((n: any) => (
                    <div key={n.id} className={`px-4 py-3 border-b border-border/50 text-sm ${!n.is_read ? 'bg-primary/5' : ''}`}>
                      <p className="font-medium text-foreground">{n.title}</p>
                      {n.description && <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <button className="rounded-xl p-2 hover:bg-accent transition-colors relative">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                {isDoctor && totalCpdPoints > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] bg-amber-500 hover:bg-amber-500 text-white border-2 border-background">
                    <Award className="h-2.5 w-2.5 mr-0.5" />
                    {totalCpdPoints}
                  </Badge>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end">
              <div className="px-3 py-2 border-b border-border mb-1">
                <p className="text-sm font-semibold text-foreground">{profile?.full_name || "User"}</p>
                <p className="text-xs text-muted-foreground capitalize">{isDoctor ? "Doctor" : "Patient"}</p>
              </div>
              <Link to="/settings" className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors">
                <Settings className="h-4 w-4" /> Settings
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-destructive/10 text-destructive transition-colors w-full">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Patient Access Requests */}
      <DoctorAccessRequests />

      {/* Stats Grid */}
      <div className="grid gap-5 grid-cols-2 lg:grid-cols-5">
        {isDoctor && (
          <StatsCard
            title="Doctor Rating"
            value={avgRating > 0 ? `${avgRating.toFixed(1)} ★` : "—"}
            change={avgRating > 0 ? "Average from patients" : "No ratings yet"}
            trend="neutral"
            icon={Star}
          />
        )}
        {isDoctor && (
          <StatsCard
            title="Total Moolas"
            value={doctorMoolas + patientMoolas}
            change={`Doctor: ${doctorMoolas} · Patient: ${patientMoolas}`}
            trend="up"
            icon={Award}
          />
        )}
        <StatsCard
          title="Total Patients"
          value={128}
          change="+12 this month"
          trend="up"
          icon={Users}
        />
        <StatsCard
          title="Appointments Today"
          value={8}
          change="2 completed"
          trend="neutral"
          icon={Calendar}
        />
        <StatsCard
          title="This Week"
          value={24}
          change="+8% from last week"
          trend="up"
          icon={TrendingUp}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TodaysBriefing />
        </div>
        <div>
          {isDoctor && <CompactTodoList />}
          <div className="mt-4"><RecentActivity /></div>
        </div>
      </div>
    </div>
  );
}
