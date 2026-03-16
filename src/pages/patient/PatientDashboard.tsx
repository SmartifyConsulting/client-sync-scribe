import { useEffect, useState } from "react";
import { Calendar, FileText, Receipt, Clock, User, Loader2, Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyRewards } from "@/hooks/usePatientRewards";
import { LollipopDisplay } from "@/components/gamification/LollipopDisplay";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isFuture } from "date-fns";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  };
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { lollipopCount, rewards, loading: rewardsLoading } = useMyRewards();
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
          .select("full_name, practice_number")
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
        recentSessions: 0, // Sessions are doctor-owned
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
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <User className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {profile?.full_name || "Patient"}
          </h1>
          <p className="text-muted-foreground">
            Manage your health information and appointments
          </p>
        </div>
      </div>

      {/* Lollipop Rewards */}
      {!rewardsLoading && lollipopCount > 0 && (
        <LollipopDisplay count={lollipopCount} rewards={rewards} showHistory variant="card" />
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingAppointments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.nextAppointment
                ? `Next: ${stats.nextAppointment.date}`
                : "No upcoming appointments"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Prescriptions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePrescriptions}</div>
            <p className="text-xs text-muted-foreground">Current medications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Doctors</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{doctors.length}</div>
            <p className="text-xs text-muted-foreground">Healthcare providers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.pendingAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingInvoices} invoice(s) pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/patient/calendar">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                My Calendar
              </CardTitle>
              <CardDescription>View and manage your appointments</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/patient/prescriptions">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Prescriptions
              </CardTitle>
              <CardDescription>View your prescription history</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/patient/invoices">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
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
          <div className="space-y-4">
            {doctors.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No doctors connected yet.</p>
                <Link to="/patient/access" className="text-primary hover:underline text-sm">
                  Invite a doctor to get started
                </Link>
              </div>
            ) : (
              <>
                {doctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {doctor.doctor_profile?.full_name || "Unknown Doctor"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Practice: {doctor.doctor_profile?.practice_number || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Connected since</p>
                      <p className="text-sm font-medium">
                        {format(parseISO(doctor.granted_at), "MMM yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
                <Link
                  to="/patient/access"
                  className="block text-center text-sm text-muted-foreground hover:text-primary py-2"
                >
                  Manage access or invite another doctor
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
