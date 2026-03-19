import { useEffect, useState } from "react";
import { Calendar, FileText, Receipt, Clock, User, Loader2, Bell, Pill, LogOut, Settings, ListChecks, ArrowRight, Info } from "lucide-react";
import moolasLogo from "@/assets/moolas-logo.jpg";
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

interface DashboardStats {
  upcomingAppointments: number;
  activePrescriptions: number;
  recentSessions: number;
  pendingInvoices: number;
  pendingAmount: number;
  nextAppointment?: {
    title: string;
    date: string;
  };
}

interface DoctorAccess {
  id: string;
  granted_at: string;
  doctor_profile?: {
    full_name: string | null;
    practice_number: string | null;
    specialty: string | null;
  };
}

interface AssignedTask {
  id: string;
  title: string;
  description: string | null;
  moolas_reward: number;
  due_date: string | null;
  status: string;
}

const getSpecialtyColor = (specialty: string): string => {
  const s = specialty.toLowerCase();
  if (s.includes("cardio")) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  if (s.includes("dent")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  if (s.includes("derma")) return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300";
  if (s.includes("ortho")) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
  if (s.includes("neuro")) return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
  if (s.includes("paed") || s.includes("pedia")) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
  if (s.includes("psych")) return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
  if (s.includes("general") || s.includes("gp") || s.includes("family")) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  if (s.includes("obst") || s.includes("gyn")) return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
  if (s.includes("ophthal") || s.includes("eye")) return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300";
  if (s.includes("ent") || s.includes("ear")) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  if (s.includes("surg")) return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300";
  return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300";
};

export default function PatientDashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const { lollipopCount, rewards, loading: rewardsLoading } = useMyRewards();

  // Fetch patient record for chronic status
  const { data: patientRecord } = useQuery({
    queryKey: ["my-patient-record"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("patients")
        .select("id, is_chronic")
        .eq("patient_user_id", user.id)
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
        .select("id, title, description, moolas_reward, due_date, status")
        .eq("patient_id", patientRecord.id)
        .eq("status", "pending")
        .order("due_date", { ascending: true })
        .limit(5);
      return (data || []) as AssignedTask[];
    },
    enabled: !!patientRecord?.id,
  });

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

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    queryClient.invalidateQueries({ queryKey: ["unread-notifications-patient-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["recent-notifications-patient-dashboard"] });
  };
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    upcomingAppointments: 0,
    activePrescriptions: 0,
    recentSessions: 0,
    pendingInvoices: 0,
    pendingAmount: 0,
  });
  const [doctors, setDoctors] = useState<DoctorAccess[]>([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch appointments
      const { data: appointments } = await supabase
        .from("appointments")
        .select("*")
        .order("start_time", { ascending: true });

      const upcomingAppointments = (appointments || []).filter(
        (apt) => isFuture(parseISO(apt.start_time))
      );

      // Fetch prescriptions
      const { data: prescriptions } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("status", "active");

      // Fetch invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("*")
        .in("status", ["pending", "overdue"]);

      const pendingAmount = (invoices || []).reduce(
        (sum, inv) => sum + Number(inv.amount),
        0
      );

      // Fetch connected doctors
      const { data: accessData } = await supabase
        .from("doctor_patient_access")
        .select("*")
        .eq("patient_user_id", user.id)
        .eq("is_active", true);

      const doctorsWithProfiles: DoctorAccess[] = [];
      for (const access of accessData || []) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, practice_number, specialty")
          .eq("id", access.doctor_id)
          .maybeSingle();

        doctorsWithProfiles.push({
          ...access,
          doctor_profile: profile || undefined,
        });
      }

      setDoctors(doctorsWithProfiles);
      setStats({
        upcomingAppointments: upcomingAppointments.length,
        activePrescriptions: (prescriptions || []).length,
        recentSessions: 0,
        pendingInvoices: (invoices || []).length,
        pendingAmount,
        nextAppointment: upcomingAppointments[0]
          ? {
              title: upcomingAppointments[0].title,
              date: format(parseISO(upcomingAppointments[0].start_time), "MMM d 'at' h:mm a"),
            }
          : undefined,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back, {profile?.full_name?.split(" ")[0] || "Patient"}
            </h1>
            <p className="text-muted-foreground">
              Manage your health information and appointments
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative h-10 w-10 rounded-full bg-terracotta flex items-center justify-center hover:bg-terracotta-dark transition-colors">
                <Bell className="h-5 w-5 text-terracotta-foreground stroke-terracotta-foreground fill-none" />
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
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>Mark all read</Button>
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
          {/* Avatar Profile Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="rounded-xl p-2 hover:bg-accent transition-colors relative">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {profile?.full_name ? profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end">
              <div className="px-3 py-2 border-b border-border mb-1">
                <p className="text-sm font-semibold text-foreground">{profile?.full_name || "User"}</p>
                <p className="text-xs text-muted-foreground">Patient</p>
              </div>
              <Link to="/profile" className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors">
                <User className="h-4 w-4" /> View Profile
              </Link>
              <Link to="/settings" className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors">
                <Settings className="h-4 w-4" /> Settings
              </Link>
              <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }} className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-destructive/10 text-destructive transition-colors w-full">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Chronic Medication Badge */}
      {patientRecord?.is_chronic && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-secondary/30 bg-secondary/5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
            <Pill className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Chronic Medication</p>
            <p className="text-sm text-muted-foreground">You are on chronic medication — remember to log daily intake for rewards</p>
          </div>
          <Badge className="ml-auto bg-secondary/10 text-secondary hover:bg-secondary/20 border-0">
            <Pill className="h-3 w-3 mr-1" />Chronic
          </Badge>
        </div>
      )}

      {/* Moolas Hero Card + Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Moolas Hero */}
        <Link to="/patient/rewards" className="lg:col-span-2">
          <Card className="h-full border-primary/20 bg-gradient-to-br from-primary/5 via-card to-secondary/5 hover:shadow-lg transition-all cursor-pointer">
            <CardContent className="flex items-center gap-5 p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 overflow-hidden">
                <img src={moolasLogo} alt="Moolas" className="h-12 w-12 object-contain" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">My Moolas Balance</p>
                <p className="text-4xl font-bold text-foreground">{lollipopCount}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingAppointments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.nextAppointment ? `Next: ${stats.nextAppointment.date}` : "None scheduled"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePrescriptions}</div>
            <p className="text-xs text-muted-foreground">Active medications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.pendingAmount)}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingInvoices} pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Tasks */}
      {assignedTasks.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Assigned Tasks</CardTitle>
              </div>
              <Link to="/patient/rewards">
                <Button variant="ghost" size="sm" className="text-primary gap-1">
                  View All <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            <CardDescription>Tasks from your doctors — complete them to earn Moolas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {assignedTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{task.title}</p>
                    {task.due_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Due: {format(parseISO(task.due_date), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  {task.moolas_reward > 0 && (
                    <Badge className="ml-2 bg-primary/10 text-primary border-0 font-bold">
                      +{task.moolas_reward} Ⓜ️
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/patient/calendar">
          <Card className="cursor-pointer border-primary/10 hover:border-primary/30 hover:shadow-md transition-all h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                My Calendar
              </CardTitle>
              <CardDescription>View and manage your appointments</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/patient/documentation">
          <Card className="cursor-pointer border-primary/10 hover:border-primary/30 hover:shadow-md transition-all h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                Documentation
              </CardTitle>
              <CardDescription>View your documents and records</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/patient/invoices">
          <Card className="cursor-pointer border-primary/10 hover:border-primary/30 hover:shadow-md transition-all h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                Invoices
              </CardTitle>
              <CardDescription>View and pay your invoices</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Connected Doctors */}
      <Card>
        <CardHeader>
          <CardTitle>My Healthcare Providers</CardTitle>
          <CardDescription>Doctors who have access to your health information</CardDescription>
        </CardHeader>
        <CardContent>
          {doctors.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No doctors connected yet.</p>
              <Link to="/patient/access" className="text-primary hover:underline text-sm">
                Invite a doctor to get started
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span>Doctor</span>
                <span>Specialty</span>
                <span>Practice #</span>
                <span></span>
              </div>
              {doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-3 py-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                >
                  <p className="font-medium text-sm text-foreground truncate">
                    {doctor.doctor_profile?.full_name || "Unknown Doctor"}
                  </p>
                  <div>
                    {doctor.doctor_profile?.specialty ? (
                      <Badge className={`text-xs font-medium border-0 ${getSpecialtyColor(doctor.doctor_profile.specialty)}`}>
                        {doctor.doctor_profile.specialty}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {doctor.doctor_profile?.practice_number || "N/A"}
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted transition-colors">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" align="end">
                      <p className="text-xs font-medium text-foreground mb-2">Access Details</p>
                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Connected since</span>
                          <span className="font-medium text-foreground">{format(parseISO(doctor.granted_at), "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status</span>
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-0 text-[10px]">Active</Badge>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              ))}
              <Link
                to="/patient/access"
                className="block text-center text-sm text-muted-foreground hover:text-primary py-2"
              >
                Manage access or invite another doctor
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
