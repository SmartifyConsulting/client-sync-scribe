import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { Calendar, FileText, Clock, User, Loader2, Wallet as Pill, ListChecks, ArrowRight, Info, Sparkles, Building2, Receipt, Star, Camera, Trophy, Heart, Mic } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyRewards } from "@/hooks/usePatientRewards";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isFuture } from "date-fns";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { RenewalsDueCard } from "@/features/patients/components/RenewalsDueCard";

interface AssignedTask {
  id: string;
  title: string;
  description: string | null;
  vulas_reward: number;
  due_date: string | null;
  status: string;
}

interface DoctorWithVisits {
  id: string;
  doctor_id: string;
  granted_at: string;
  doctor_profile?: {
    full_name: string | null;
    practice_number: string | null;
    specialty: string | null;
  };
  lastSeen?: string | null;
  nextAppointment?: string | null;
}

interface Pharmacy {
  name: string;
  email?: string;
  phone?: string;
  is_primary?: boolean;
}

const getSpecialtyColor = (specialty: string): string => {
  const s = specialty.toLowerCase();
  if (s.includes("cardio")) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  if (s.includes("dent")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  if (s.includes("derma")) return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300";
  if (s.includes("ortho")) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
  if (s.includes("neuro")) return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
  if (s.includes("paed") || s.includes("pedia")) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
  if (s.includes("psych")) return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
  if (s.includes("general") || s.includes("gp") || s.includes("family")) return "bg-sky-50 text-primary dark:bg-primary/15 dark:text-primary";
  return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300";
};

export default function PatientDashboard() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const { lollipopCount, loading: rewardsLoading } = useMyRewards();

  // Fetch patient record
  const { data: patientRecord } = useQuery({
    queryKey: ["my-patient-record-dashboard"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("patients")
        .select("id, name, is_chronic, pharmacies, pharmacy_name, pharmacy_email, allergies, dob, status, created_at, notes, occupation, general_practitioner, medical_aid")
        .eq("patient_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Fetch assigned tasks
  const { data: assignedTasks = [] } = useQuery({
    queryKey: ["assigned-tasks-dashboard", patientRecord?.id],
    queryFn: async () => {
      if (!patientRecord?.id) return [];
      const { data } = await supabase
        .from("todos")
        .select("id, title, description, vulas_reward, due_date, status")
        .eq("patient_id", patientRecord.id)
        .eq("assignee", "patient")
        .eq("status", "pending")
        .order("due_date", { ascending: true })
        .limit(5);

      return (data || []) as AssignedTask[];
    },
    enabled: !!patientRecord?.id,
  });

  // Fetch notifications
  const { data: unreadNotifCount = 0 } = useQuery({
    queryKey: ["unread-notifications-patient-dashboard"],
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
    queryKey: ["recent-notifications-patient-dashboard"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch prescriptions (medications)
  const { data: medications = [] } = useQuery({
    queryKey: ["patient-medications-dashboard", patientRecord?.id],
    queryFn: async () => {
      if (!patientRecord?.id) return [];
      const { data } = await supabase
        .from("prescriptions")
        .select("id, medication, dosage, frequency, status, start_date, end_date, instructions")
        .eq("patient_id", patientRecord.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!patientRecord?.id,
  });

  // Fetch doctors with last seen / next appointment
  const { data: doctors = [] } = useQuery({
    queryKey: ["patient-doctors-dashboard"],
    queryFn: async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return [];
      
      const { data: accessData } = await supabase
        .from("doctor_patient_access")
        .select("id, doctor_id, granted_at")
        .eq("patient_user_id", currentUser.id)
        .eq("is_active", true);

      if (!accessData?.length) return [];

      const results: DoctorWithVisits[] = [];
      for (const access of accessData) {
        const { data: doctorProfile } = await supabase
          .from("profiles")
          .select("full_name, practice_number, specialty")
          .eq("id", access.doctor_id)
          .maybeSingle();

        // Last session with this doctor
        const { data: lastSession } = await supabase
          .from("sessions")
          .select("ended_at")
          .eq("user_id", access.doctor_id)
          .eq("status", "completed")
          .order("ended_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Next appointment with this doctor
        const { data: nextAppt } = await supabase
          .from("appointments")
          .select("start_time")
          .eq("user_id", access.doctor_id)
          .gte("start_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(1)
          .maybeSingle();

        results.push({
          ...access,
          doctor_profile: doctorProfile || undefined,
          lastSeen: lastSession?.ended_at || null,
          nextAppointment: nextAppt?.start_time || null,
        });
      }
      return results;
    },
  });

  // Fetch recent claims (invoices submitted to insurance)
  const { data: recentClaims = [] } = useQuery({
    queryKey: ["patient-recent-claims", patientRecord?.id],
    queryFn: async () => {
      if (!patientRecord?.id) return [];
      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, status, created_at, email_sent_at")
        .eq("patient_id", patientRecord.id)
        .not("email_sent_at", "is", null)
        .order("email_sent_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!patientRecord?.id,
  });

  // AI Health Summary
  const { data: aiSummary, isLoading: aiSummaryLoading } = useQuery({
    queryKey: ["patient-ai-summary", patientRecord?.id],
    queryFn: async () => {
      if (!patientRecord) return null;
      // Fetch sessions for context
      const { data: sessions } = await supabase
        .from("sessions")
        .select("started_at, summary, transcript, status")
        .neq("status", "paused")
        .order("started_at", { ascending: false })
        .limit(20);

      const { data, error } = await supabase.functions.invoke("summarize-patient-history", {
        body: {
          patient: patientRecord,
          sessions: sessions || [],
          language: profile?.preferred_language || "English",
        },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!patientRecord?.id,
    staleTime: 1000 * 60 * 10, // 10 min cache
    retry: 1,
  });

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    queryClient.invalidateQueries({ queryKey: ["unread-notifications-patient-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["recent-notifications-patient-dashboard"] });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(amount);

  // Parse pharmacies from patient record
  const pharmacies: Pharmacy[] = (() => {
    const list: Pharmacy[] = [];
    if (patientRecord?.pharmacies && Array.isArray(patientRecord.pharmacies)) {
      for (const p of patientRecord.pharmacies as any[]) {
        list.push({ name: p.name || "Unnamed", email: p.email, phone: p.phone, is_primary: p.is_primary || false });
      }
    }
    // Also add legacy single pharmacy if not already in list
    if (patientRecord?.pharmacy_name && !list.find(p => p.name === patientRecord.pharmacy_name)) {
      list.unshift({ name: patientRecord.pharmacy_name, email: patientRecord.pharmacy_email || undefined, is_primary: list.length === 0 });
    }
    return list;
  })();

  const activeMeds = medications.filter(m => m.status === "active");
  const pastMeds = medications.filter(m => m.status !== "active");

  // Strip HTML-like tags from AI summary for plain display
  const cleanSummary = (text: string) =>
    text?.replace(/<\/?(?:med|symptom|condition)>/g, "") || "";

  if (!patientRecord) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Welcome Header */}
      <div className={isMobile ? "space-y-3" : "flex items-center justify-between"}>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <User className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {profile?.full_name ? `${t("patientDashboard.welcomeTitle")}, ${profile.full_name.split(" ")[0]}` : t("patientDashboard.welcomeTitle")}
            </h1>
            <p className="text-muted-foreground text-xs">{t("patientDashboard.welcomeSubtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/patient/calendar">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5" /> {t("patientDashboard.calendar")}
            </Button>
          </Link>
          <Link to="/patient/tasks?autoRecord=true">
            <Button size="sm" className="gap-1.5 text-xs bg-primary">
              <Mic className="h-3.5 w-3.5" /> {t("patientDashboard.recordTask")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Recent Activity Banner */}
      {recentNotifications.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-card shadow-sm overflow-hidden">
          <div className="px-3 py-2 bg-primary/5 border-b border-primary/10 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">{t("patientDashboard.recentActivity")}</span>
          </div>
          <div className="flex overflow-x-auto gap-2 p-2.5 scrollbar-hide">
            {recentNotifications.slice(0, 8).map((notif: any) => {
              const icon = notif.type === "session_completed" ? Clock : notif.type === "document" ? FileText : notif.type === "reward" ? Trophy : Info;
              const Icon = icon;
              return (
                <div key={notif.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 min-w-[200px] shrink-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary shrink-0">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{notif.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{format(parseISO(notif.created_at), "MMM d")}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Row 1: AI Health Summary + Upcoming Appointments */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
        {!isMobile && (
          <Card className="border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                {t("patientDashboard.aiSummaryTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aiSummaryLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              ) : aiSummary?.summary ? (
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                  {cleanSummary(aiSummary.summary)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">{t("patientDashboard.aiSummaryEmpty")}</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-primary" />
              {t("patientDashboard.appointmentsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {doctors.filter(d => d.nextAppointment).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t("patientDashboard.appointmentsEmpty")}</p>
            ) : (
              <div className="space-y-1.5">
                {doctors.filter(d => d.nextAppointment).map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border">
                    <div>
                      <p className="text-xs font-medium text-foreground">{doc.doctor_profile?.full_name || t("patientDashboard.doctorFallback")}</p>
                      <p className="text-xs text-muted-foreground">{doc.nextAppointment ? format(parseISO(doc.nextAppointment), "MMM d, h:mm a") : ""}</p>
                    </div>
                    {doc.doctor_profile?.specialty && (
                      <Badge className={`text-xs border-0 ${getSpecialtyColor(doc.doctor_profile.specialty)}`}>{doc.doctor_profile.specialty}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Vulas Balance */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
        <Link to="/patient/rewards">
          <Card className="h-full border-primary hover:shadow-lg transition-all cursor-pointer">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shrink-0">
                <Trophy className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("patientDashboard.vulaLabel")}</p>
                <p className="text-2xl font-bold text-foreground">{lollipopCount}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>


        {!isMobile && (
          <Card className="border-primary/10 bg-gradient-to-br from-primary/3 to-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-primary" />
                {t("patientDashboard.earnVulasTitle")}
              </CardTitle>
              <CardDescription className="text-xs">{t("patientDashboard.earnVulasDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { icon: Pill, text: t("patientDashboard.tip1"), link: "/patient/prescriptions" },
                  { icon: ListChecks, text: t("patientDashboard.tip2"), link: "/patient/tasks" },
                  { icon: Camera, text: t("patientDashboard.tip3"), link: "/patient/health-album" },
                  { icon: Calendar, text: t("patientDashboard.tip4"), link: "/patient/calendar" },
                ].map((tip, i) => (
                  <Link key={i} to={tip.link} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-primary-dark/5 transition-colors group">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary shrink-0">
                      <tip.icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <p className="text-sm text-foreground group-hover:text-primary transition-colors">{tip.text}</p>
                    <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Row 3: Recent Claims + Documentation (hidden on mobile) */}
      {!isMobile && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Receipt className="h-4 w-4 text-primary" />
                  {t("patientDashboard.claimsTitle")}
                </CardTitle>
                <Link to="/patient/invoices">
                  <Button variant="ghost" size="sm" className="text-xs h-6 text-primary gap-1">
                    {t("patientDashboard.claimsAllInvoices")} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <CardDescription className="text-xs">{t("patientDashboard.claimsDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {recentClaims.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t("patientDashboard.claimsEmpty")}</p>
              ) : (
                <div className="space-y-1.5">
                  {recentClaims.map((claim: any) => (
                    <div key={claim.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border">
                      <div>
                        <p className="text-xs font-medium text-foreground">#{claim.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">
                          Submitted {claim.email_sent_at ? format(parseISO(claim.email_sent_at), "MMM d, yyyy") : "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-foreground">{formatCurrency(Number(claim.amount))}</p>
                        <Badge variant="outline" className="text-xs capitalize">{claim.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Link to="/patient/documentation">
            <Card className="cursor-pointer border-primary/10 hover:border-primary/30 hover:shadow-md transition-all h-full">
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  {t("patientDashboard.documentationTitle")}
                </CardTitle>
                <CardDescription className="text-xs">{t("patientDashboard.documentationDescription")}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      )}

      {/* Renewals due */}
      {patientRecord?.id && user?.id && (
        <RenewalsDueCard patientId={patientRecord.id} patientUserId={user.id} />
      )}

      {/* Assigned Tasks */}
      {assignedTasks.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ListChecks className="h-4 w-4 text-primary" />
                {t("patientDashboard.tasksTitle")}
              </CardTitle>
              <Link to="/patient/rewards">
                <Button variant="ghost" size="sm" className="text-xs h-6 text-primary gap-1">
                  {t("patientDashboard.tasksViewAll")} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <CardDescription className="text-xs">{t("patientDashboard.tasksDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {assignedTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{task.title}</p>
                    {task.due_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("patientDashboard.tasksDue")}: {format(parseISO(task.due_date), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  {task.vulas_reward > 0 && (
                    <Badge className="ml-2 bg-primary text-primary border-0 text-xs font-bold">
                      +{task.vulas_reward} Ⓜ️
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
