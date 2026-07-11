import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PatientDetailsEditor } from "@/components/patients/PatientDetailsEditor";
import { Patient } from "@/hooks/usePatients";
import { useToast } from "@/hooks/use-toast";
import { useMyRewards } from "@/hooks/usePatientRewards";
import { EmergencyContact } from "@/features/patients/components/EmergencyContactsSection";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";




export default function MyDetails() {
  const [searchParams] = useSearchParams();
  const rawSection = searchParams.get("section");
  const section = rawSection === "home" ? "health" : rawSection || "health";
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const { toast } = useToast();
  const { lollipopCount, loading: rewardsLoading } = useMyRewards();

  useEffect(() => {
    fetchPatientRecord();
  }, []);

  const fetchPatientRecord = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email || "");
      setUserId(user.id);

      let { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("patient_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      // Self-heal: if no patient row exists for this user, create a minimal one
      if (!data) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, mobile_number")
          .eq("id", user.id)
          .maybeSingle();

        const fallbackName =
          profile?.full_name ||
          (user.email ? user.email.split("@")[0] : "New Patient");

        const { data: created, error: insertErr } = await supabase
          .from("patients")
          .insert({
            user_id: user.id,
            patient_user_id: user.id,
            name: fallbackName,
            email: user.email || null,
            phone: profile?.mobile_number || null,
          })
          .select("*")
          .single();

        if (insertErr) {
          toast({
            title: "Could not initialize your record",
            description: insertErr.message,
            variant: "destructive",
          });
          return;
        }
        data = created;
      }

      if (data) {
        setPatient({
          ...data,
          surgeries: Array.isArray(data.surgeries) ? data.surgeries as unknown as Patient["surgeries"] : [],
          pharmacies: Array.isArray(data.pharmacies) ? data.pharmacies as unknown as Patient["pharmacies"] : [],
          family_history: Array.isArray(data.family_history) ? data.family_history as unknown as Patient["family_history"] : [],
          next_of_kin_members: Array.isArray(data.next_of_kin_members) ? data.next_of_kin_members as unknown as Patient["next_of_kin_members"] : [],
          current_medications: Array.isArray(data.current_medications) ? data.current_medications as unknown as Patient["current_medications"] : [],
        } as unknown as Patient);
        const ec = (data as any).emergency_contacts;
        setEmergencyContacts(Array.isArray(ec) ? ec : []);
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

  const isIncomplete = useMemo(() => {
    if (!patient) return true;
    const p: any = patient;
    return (
      !p.dob ||
      !p.physical_address ||
      !p.phone ||
      (!(emergencyContacts && emergencyContacts.length > 0) && !p.next_of_kin_name)
    );
  }, [patient, emergencyContacts]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        <p className="text-muted-foreground text-sm">{heading.subtitle}</p>
      </div>

      {isIncomplete && section === "health" && <ProfileCompletionBanner />}

      {patient ? (
        <PatientDetailsEditor
          patient={patient}
          onSave={handleSave}
          isSelfService
          userEmail={userEmail}
          userId={userId}
          emergencyContacts={emergencyContacts}
          onEmergencyContactsChange={setEmergencyContacts}
          lollipopCount={lollipopCount}
          rewardsLoading={rewardsLoading}
          section={section}
        />
      ) : (
        <div className="p-6 text-center text-muted-foreground border border-dashed border-border rounded-lg">
          <p>Your medical record is being set up. Please refresh in a moment.</p>
        </div>
      )}

    </div>
  );
}
