import { useState, useEffect } from "react";
import { FileText, Calendar, User, Wallet as Pill, Download, Eye, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RenewalsDueCard } from "@/features/patients/components/RenewalsDueCard";


interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  instructions: string | null;
  start_date: string;
  end_date: string | null;
  refills_remaining: number;
  status: string;
  created_at: string;
  doctor_profile?: {
    full_name: string | null;
  };
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function Documentation() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (user) {
      fetchPrescriptions();
    }
  }, [user]);

  const fetchPrescriptions = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Resolve the patient record id for this user (needed for renewals).
      const { data: patient } = await supabase
        .from("patients")
        .select("id")
        .eq("patient_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setPatientId(patient?.id ?? null);

      const { data, error } = await supabase
        .from("prescriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch doctor profiles for each prescription
      const prescriptionsWithDoctors: Prescription[] = [];
      for (const rx of data || []) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", rx.doctor_id)
          .maybeSingle();

        prescriptionsWithDoctors.push({
          ...rx,
          doctor_profile: profile || undefined,
        });
      }

      setPrescriptions(prescriptionsWithDoctors);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrescriptions = prescriptions.filter((rx) => {
    const matchesSearch = rx.medication.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || rx.status === filter;
    return matchesSearch && matchesFilter;
  });

  const activePrescriptions = prescriptions.filter((rx) => rx.status === "active").length;
  const refillNeeded = prescriptions.filter((rx) => rx.status === "active" && rx.refills_remaining > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Documentation</h1>
        <p className="text-muted-foreground text-xs">View and manage your documents</p>
      </div>

      {patientId && user?.id && (
        <RenewalsDueCard patientId={patientId} patientUserId={user.id} />
      )}


      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Prescriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activePrescriptions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Refills Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{refillNeeded}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Prescriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prescriptions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div>
              <CardTitle>Patient Documents</CardTitle>
              <CardDescription>Your complete documentation history</CardDescription>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Search medications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-[200px]"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {["all", "active", "completed", "cancelled"].map((status) => (
              <Button
                key={status}
                variant={filter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(status)}
              >
                {status === "all" ? "All" : statusLabels[status] || status}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPrescriptions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {prescriptions.length === 0 
                  ? "No prescriptions found. Your prescriptions will appear here once your doctor adds them."
                  : "No prescriptions match your search criteria."
                }
              </p>
            ) : (
              filteredPrescriptions.map((rx) => (
                <div
                  key={rx.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Pill className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{rx.medication}</p>
                        <p className="text-sm text-muted-foreground">{rx.dosage} - {rx.frequency}</p>
                      </div>
                      <Badge className={statusColors[rx.status] || statusColors.active}>
                        {statusLabels[rx.status] || rx.status}
                      </Badge>
                    </div>
                    {rx.instructions && (
                      <p className="text-sm text-muted-foreground">{rx.instructions}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Started: {format(parseISO(rx.start_date), "MMM d, yyyy")}
                      </span>
                      {rx.doctor_profile?.full_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {rx.doctor_profile.full_name}
                        </span>
                      )}
                      {rx.refills_remaining > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {rx.refills_remaining} refill(s) remaining
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
