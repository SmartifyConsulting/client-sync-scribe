import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate, Navigate } from "react-router-dom";
import { Loader2, Siren, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PatientDetailsEditor } from "@/components/patients/PatientDetailsEditor";
import { Patient } from "@/hooks/usePatients";
import { useToast } from "@/hooks/use-toast";
import { useMyRewards } from "@/hooks/usePatientRewards";
import { Card, CardContent } from "@/components/ui/card";
import { useHolarcHelpAccess } from "@/modules/holarchelp/hooks/useHolarcHelpAccess";
import PatientIncidentHistory from "@/components/holarchelp/PatientIncidentHistory";
import { useAuth } from "@/hooks/useAuth";


export default function MyDetails() {
  const [searchParams] = useSearchParams();
  const rawSection = searchParams.get("section");
  const section = rawSection === "home" ? "health" : rawSection || "health";
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const { toast } = useToast();
  const { lollipopCount, loading: rewardsLoading } = useMyRewards();
  const { user } = useAuth();
  const { enabled: holarcHelpOn } = useHolarcHelpAccess();

  useEffect(() => {
    fetchPatientRecord();
  }, []);

  const fetchPatientRecord = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email || "");

      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("patient_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPatient({
          ...data,
          surgeries: Array.isArray(data.surgeries) ? data.surgeries as unknown as Patient["surgeries"] : [],
          pharmacies: Array.isArray(data.pharmacies) ? data.pharmacies as unknown as Patient["pharmacies"] : [],
          family_history: Array.isArray(data.family_history) ? data.family_history as unknown as Patient["family_history"] : [],
          next_of_kin_members: Array.isArray(data.next_of_kin_members) ? data.next_of_kin_members as unknown as Patient["next_of_kin_members"] : [],
          current_medications: Array.isArray(data.current_medications) ? data.current_medications as unknown as Patient["current_medications"] : [],
        } as unknown as Patient);
      }
    } catch (err) {
      console.error("Error fetching patient record:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updates: Partial<Patient>) => {
    if (!patient) return;
    const { error } = await supabase
      .from("patients")
      .update(updates as any)
      .eq("id", patient.id);

    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
      throw error;
    }

    setPatient((prev) => prev ? { ...prev, ...updates } : prev);
    toast({ title: "Saved", description: "Your details have been updated." });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>No patient record found. Please ask your doctor to create your profile.</p>
      </div>
    );
  }

  if (rawSection === "home") {
    return <Navigate to="/patient/details?section=health" replace />;
  }

  const sectionHeading: Record<string, { title: string; subtitle: string }> = {
    health: { title: "My Holarchive", subtitle: "View and update your personal and medical information" },
    care: { title: "My Holarchy", subtitle: "Your healthcare team, sessions and coordination" },
    admin: { title: "My Desk", subtitle: "Calendar, tasks and documents" },
    rewards: { title: "My Rewards", subtitle: "Track your Vulas and adherence streaks" },
  };
  const heading = sectionHeading[section] || sectionHeading.health;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{heading.title}</h1>
        <p className="text-muted-foreground text-[12px]">{heading.subtitle}</p>
      </div>

      {holarcHelpOn && (
        <div className="grid grid-cols-2 gap-3">
          <Link to="/patient/holarchelp" className="block">
            <Card className="h-full border-red-500/30 bg-gradient-to-br from-red-500 to-red-600 hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center gap-1 p-4 text-white">
                <Siren className="h-7 w-7" />
                <p className="text-base font-extrabold tracking-wide">SOS</p>
                <p className="text-[10px] opacity-90">Emergency help</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/patient/holarchelp/contacts" className="block">
            <Card className="h-full border-primary/20 hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center gap-1 p-4">
                <MapPin className="h-7 w-7 text-primary" />
                <p className="text-base font-extrabold tracking-wide text-foreground">Nearby</p>
                <p className="text-[10px] text-muted-foreground">Hospitals & ambulances</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {holarcHelpOn && user?.id && (
        <PatientIncidentHistory userId={user.id} />
      )}

      <PatientDetailsEditor patient={patient} onSave={handleSave} isSelfService userEmail={userEmail} lollipopCount={lollipopCount} rewardsLoading={rewardsLoading} section={section} />
    </div>
  );
}
