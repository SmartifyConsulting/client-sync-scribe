import { Users, Calendar, TrendingUp, Award, MessageSquare, Search } from "lucide-react";
import vulaVouchersLogo from "@/assets/vula-vouchers-logo-v3.png";
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
import { VulaExplainerContent } from "@/features/rewards/components/VulaExplainerDialog";


import { useUserRole } from "@/hooks/useUserRole";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [rtSearch, setRtSearch] = useState("");

  const shouldRedirectPatient = !roleLoading && isPatient;

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
      const { data: { user } } = await supabase.auth.getUser();
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
  const { data: ratingData = { avg: 0, communication: 0, expertise: 0, professionalism: 0, count: 0 } } = useQuery({
    queryKey: ["doctor-rating-breakdown"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
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
      const { data: { user } } = await supabase.auth.getUser();
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

  // Query for patients list (for round table starter)
  const { data: patientsList = [] } = useQuery({
    queryKey: ["patients-list-dashboard"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("patients")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name");
      if (error) return [];
      return data || [];
    },
    enabled: isDoctor,
  });

  const filteredPatients = rtSearch.trim()
    ? patientsList.filter((p: any) => p.name.toLowerCase().includes(rtSearch.toLowerCase()))
    : patientsList;

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
      <div className="flex items-start justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {greeting}{displayName ? `, ${displayName}` : ''}
          </h1>
          <p className="mt-2 text-muted-foreground text-xs">
            {t("doctorDashboard.subtitle")}
            <span className="block md:inline"> {formattedDate}</span>
          </p>
        </div>
        {isDoctor && (
          <div className="hidden lg:block w-72 shrink-0 rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            <VulaExplainerContent onCta={() => navigate("/doctor/rewards")} />
          </div>
        )}
      </div>

      {doctorIncomplete && (
        <ProfileCompletionBanner
          title="Complete your practitioner profile"
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
            title={t("doctorDashboard.vulaVouchers")}
            value={doctorVulas + patientVulas}
            change={undefined}
            trend="up"
            icon={Award}
            imageUrl={vulaVouchersLogo}
            iconSize="large"
            href="/doctor/rewards"
          />
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
          {isDoctor && <CompactTodoList />}
          {isDoctor && (
            <div className="hidden lg:block">
              <div className="rounded-xl border border-primary bg-card shadow-sm">
                <div className="w-full rounded-t-xl bg-primary px-4 py-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-primary-foreground">{t("doctorDashboard.myRoundTables")}</h3>
                  <MessageSquare className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="p-3 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder={t("doctorDashboard.searchRoundTable")}
                      className="pl-9 h-8 text-xs"
                      value={rtSearch}
                      onChange={(e) => setRtSearch(e.target.value)}
                    />
                  </div>
                  {rtSearch.trim() && filteredPatients.length > 0 && (
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {filteredPatients.slice(0, 5).map((p: any) => (
                        <button
                          key={p.id}
                          onClick={() => { navigate(`/patients/${p.id}?tab=roundtable`); setRtSearch(""); }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-xs font-medium text-foreground transition-colors"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {rtSearch.trim() && filteredPatients.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">{t("doctorDashboard.noPatientsFound")}</p>
                  )}
                  <DoctorRoundTables />
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
                <div className="p-3 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder={t("doctorDashboard.searchRoundTable")}
                      className="pl-9 h-8 text-xs"
                      value={rtSearch}
                      onChange={(e) => setRtSearch(e.target.value)}
                    />
                  </div>
                  {rtSearch.trim() && filteredPatients.length > 0 && (
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {filteredPatients.slice(0, 5).map((p: any) => (
                        <button
                          key={p.id}
                          onClick={() => { navigate(`/patients/${p.id}?tab=roundtable`); setRtSearch(""); }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-xs font-medium text-foreground transition-colors"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {rtSearch.trim() && filteredPatients.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">{t("doctorDashboard.noPatientsFound")}</p>
                  )}
                  <DoctorRoundTables />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
