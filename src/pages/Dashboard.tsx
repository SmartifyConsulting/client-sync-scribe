import { Users, Calendar, TrendingUp, Clock, MessageSquare } from "lucide-react";
import vulaVouchersLogo from "@/assets/vula-vouchers-logo-v3.png";
import { WealthRoleOverview } from "@/features/wealth-workflow/WealthRoleOverview";
import { CompactTodoList } from "@/components/dashboard/CompactTodoList";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { TodaysBriefing } from "@/components/dashboard/TodaysBriefing";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { DoctorAccessRequests } from "@/components/doctor/DoctorAccessRequests";
import { DoctorRoundTables } from "@/components/doctor/DoctorRoundTables";
import { useProfile } from "@/hooks/useProfile";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";


import { useUserRole } from "@/hooks/useUserRole";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { t } = useTranslation();
  const { profile, loading: profileLoading } = useProfile();
  const { isDoctor, isPatient, loading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const shouldRedirectPatient = !roleLoading && isPatient;

  // Query for unread notifications count (invitations + document receipts only)
  const { data: unreadNotifCount = 0 } = useQuery({
    queryKey: ["unread-notifications-dashboard"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return 0;

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
        .in("type", ["invitation", "document", "document_received", "connection_request", "reward", "streak", "access_accepted", "access_declined", "access_request", "appointment_request"]);

      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  // Query for recent notifications
  const { data: recentNotifications = [] } = useQuery({
    queryKey: ["recent-notifications-dashboard"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) return [];
      return data || [];
    },
    refetchInterval: 30000,
  });

  const clearNotification = async (notifId: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", notifId);
    queryClient.invalidateQueries({ queryKey: ["unread-notifications-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["recent-notifications-dashboard"] });
  };

  const clearAllNotifications = async () => {
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
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
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
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return 0;

      const { count, error } = await supabase
        .from("todos")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("assignee", "doctor")
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
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
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
  const { data: ratingData = { avg: 0, communication: 0, expertise: 0, professionalism: 0, count: 0 } } = useQuery({
    queryKey: ["doctor-rating-breakdown"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return { avg: 0, communication: 0, expertise: 0, professionalism: 0, count: 0 };
      const { data, error } = await supabase
        .from("visit_ratings")
        .select("rating, communication_rating, expertise_rating, professionalism_rating")
        .eq("rated_user_id", user.id);
      if (error || !data || data.length === 0) return { avg: 0, communication: 0, expertise: 0, professionalism: 0, count: 0 };
      const count = data.length;
      const avg = data.reduce((s, r) => s + r.rating, 0) / count;
      const withCriteria = data.filter(r => r.communication_rating != null);
      const cc = withCriteria.length;
      return {
        avg,
        communication: cc ? withCriteria.reduce((s, r) => s + (r.communication_rating || 0), 0) / cc : 0,
        expertise: cc ? withCriteria.reduce((s, r) => s + (r.expertise_rating || 0), 0) / cc : 0,
        professionalism: cc ? withCriteria.reduce((s, r) => s + (r.professionalism_rating || 0), 0) / cc : 0,
        count,
      };
    },
    refetchInterval: 60000,
  });

  // Query for doctor vulas (from doctor_rewards)
  const { data: doctorVulas = 0 } = useQuery({
    queryKey: ["doctor-vulas-dashboard"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return 0;
      const { data, error } = await supabase
        .from("doctor_rewards")
        .select("vulas_count")
        .eq("doctor_id", user.id);
      if (error || !data) return 0;
      return data.reduce((sum, r) => sum + (r.vulas_count || 0), 0);
    },
    refetchInterval: 60000,
  });

  // Query for patient vulas (from patient_rewards where patient is linked to this user)
  const { data: patientVulas = 0 } = useQuery({
    queryKey: ["patient-vulas-dashboard"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
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

  // Query for time saved this week by automating admin (auto-executed todos,
  // e.g. auto-created prescriptions/certificates/invoices from a session).
  const { data: timeSavedHours = 0 } = useQuery({
    queryKey: ["doctor-time-saved-dashboard"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return 0;
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from("todos")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_auto_executed", true)
        .gte("created_at", weekAgo);
      if (error) return 0;
      // ~8 minutes saved per automated admin action (drafting a document, filing a task, etc.)
      return Math.round(((count || 0) * 8 / 60) * 10) / 10;
    },
    refetchInterval: 60000,
  });

  const displayName = (() => {
    if (profileLoading || roleLoading) return '';
    if (!profile?.full_name) return isDoctor ? 'Doctor' : '';
    
    const nameParts = profile.full_name.split(' ');
    if (isDoctor) {
      const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
      return `Dr. ${surname}`;
    } else {
      return nameParts[0];
    }
  })();

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
  const greeting = hour < 12 ? t("doctorDashboard.greetingMorning") : hour < 18 ? t("doctorDashboard.greetingAfternoon") : t("doctorDashboard.greetingEvening");
  
  // Format today's date
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  if (shouldRedirectPatient) {
    return <Navigate to="/patient/details" replace />;
  }

  const doctorIncomplete = isDoctor && profile && (
    !(profile as any).specialty ||
    !(profile as any).practice_number ||
    !(profile as any).doctor_number ||
    !(profile as any).practice_address
  );

  return (
    <div className="space-y-4 md:space-y-8 animate-fade-in">
      {/* Header with Profile */}
      <div className="pb-2">
        <h1 className="page-title">
          {greeting}{displayName ? `, ${displayName}` : ''}
        </h1>
        <p className="mt-2 text-muted-foreground text-xs">
          {t("doctorDashboard.subtitle")}
          <span className="block md:inline"> {formattedDate}</span>
        </p>
      </div>

      {doctorIncomplete && (
        <ProfileCompletionBanner
          title="Complete your wealth manager profile"
          message="Add your specialty, practice number, HPCSA/registration number and practice address so patients can find you and your documents render correctly. All credentials are encrypted in transit and at rest, visible only to you and patients you connect with. Holarc Health is HIPAA- and POPIA-aligned and never sells or shares your data."
          onComplete={() => navigate("/profile")}
          storageKey="holarc_doctor_profile_banner_dismissed"
        />
      )}

      {/* Patient Access Requests */}
      <DoctorAccessRequests />

      {/* Stats Grid */}
      <div className="grid gap-2 md:gap-5 grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title={t("doctorDashboard.totalPatients")}
          value={128}
          change="+12"
          trend="up"
          icon={Users}
          href="/patients"
        />
        <StatsCard
          title={t("doctorDashboard.thisWeek")}
          value={24}
          change="+8%"
          trend="up"
          icon={TrendingUp}
          href="/calendar"
        />
        {isDoctor && (
          <StatsCard
            title="Time Saved This Week"
            value={`${timeSavedHours} hrs`}
            change="By automating admin"
            trend="up"
            icon={Clock}
            href="/todos"
          />
        )}
        {false && isDoctor && (
          <Link
            to="/doctor/rewards"
            className="col-span-2 min-h-[80px] md:min-h-[100px] flex items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-white p-2 md:p-3 text-center shadow-card hover:shadow-card-hover transition-all duration-300"
          >
            <div className="flex flex-col items-center shrink-0">
              <p className="text-xl md:text-2xl font-bold text-blue-600 leading-none mb-1">{doctorVulas + patientVulas}</p>
              <img src={vulaVouchersLogo} alt="Vulas" className="h-9 w-auto md:h-10 object-contain" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-xs md:text-sm font-bold text-foreground leading-tight">
                For reaching your goals.
              </p>
              <p className="text-xs text-muted-foreground">
                Track your progress and redeem vouchers
              </p>
            </div>
          </Link>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-3 md:gap-6 grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <TodaysBriefing />
          <div className="hidden lg:block">
            <RecentActivity />
          </div>
        </div>
        <div className="lg:col-span-2 space-y-6">
          {isDoctor && <WealthRoleOverview />}
          {isDoctor && <CompactTodoList />}
          {isDoctor && (
            <div className="hidden lg:block">
              <div className="rounded-xl border border-primary bg-card shadow-sm">
                <div className="w-full rounded-t-xl bg-primary px-4 py-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-primary-foreground">{t("doctorDashboard.myRoundTables")}</h3>
                  <MessageSquare className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="p-3 space-y-3 max-h-[360px] overflow-y-auto">
                  <DoctorRoundTables compact />
                </div>
              </div>
            </div>
          )}
          <div className="lg:hidden">
            <RecentActivity />
          </div>
          {isDoctor && (
            <div className="lg:hidden">
              <div className="rounded-xl border border-primary bg-card shadow-sm">
                <div className="w-full rounded-t-xl bg-primary px-4 py-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-primary-foreground">{t("doctorDashboard.myRoundTables")}</h3>
                  <MessageSquare className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="p-3 space-y-3 max-h-[360px] overflow-y-auto">
                  <DoctorRoundTables compact />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
