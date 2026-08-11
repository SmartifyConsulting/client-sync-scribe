import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PatientDetailsEditor } from "@/components/patients/PatientDetailsEditor";
import { Patient } from "@/hooks/usePatients";
import { useToast } from "@/hooks/use-toast";
import { useMyRewards } from "@/hooks/usePatientRewards";
import { EmergencyContact } from "@/features/patients/components/EmergencyContactsSection";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";




export default function MyDetails() {
  const { t } = useTranslation();
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
  const lastSavedToastRef = useRef<number>(0);

  useEffect(() => {
    fetchPatientRecord();
  }, []);

  const fetchPatientRecord = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email || "");
      setUserId(user.id);

      // 1) Prefer a non-archived row linked to this user
      let { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("patient_user_id", user.id)
        .neq("status", "archived")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      // 2) Fallback: find a non-archived row by email and self-heal the link
      if (!data && user.email) {
        const { data: byEmail } = await supabase
          .from("patients")
          .select("*")
          .ilike("email", user.email)
          .neq("status", "archived")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (byEmail) {
          const { data: healed } = await supabase
            .from("patients")
            .update({ patient_user_id: user.id })
            .eq("id", byEmail.id)
            .select("*")
            .maybeSingle();
          data = healed || byEmail;
        }
      }

      // 3) Self-heal: if still nothing, create a minimal row
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
          // A unique-violation means a concurrent flow (another tab, the
          // signup insert, Profile.tsx's fallback) already created this
          // user's record — fetch it instead of surfacing an error.
          if ((insertErr as any).code === "23505") {
            const { data: winner } = await supabase
              .from("patients")
              .select("*")
              .eq("patient_user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            data = winner;
          } else {
            toast({
              title: t("patient.myDetails.errorInitializeTitle"),
              description: insertErr.message,
              variant: "destructive",
            });
            return;
          }
        } else {
          data = created;
        }
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
      toast({ title: t("patient.myDetails.errorSaveTitle"), description: error.message, variant: "destructive" });
      throw error;
    }

    setPatient((prev) => prev ? { ...prev, ...updates } : prev);

    // Autosave fires frequently while typing — only surface a toast every
    // 20s so it doesn't interrupt the user mid-keystroke.
    const now = Date.now();
    if (now - lastSavedToastRef.current > 20000) {
      lastSavedToastRef.current = now;
      toast({ title: t("common.saved"), description: t("patient.myDetails.detailsUpdated") });
    }
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
    health: { title: t("patient.myDetails.myHolarchy", "My Holarchy"), subtitle: t("patient.myDetails.holarchySubtitle", "Your health information, care team and history") },
    admin: { title: t("patient.myDetails.myDesk", "My Desk"), subtitle: t("patient.myDetails.deskSubtitle", "Calendar, tasks and documents") },
    rewards: { title: t("patient.myDetails.myRewards", "My Rewards"), subtitle: t("patient.myDetails.rewardsSubtitle", "Track your Vulas and rewards") },
  };
  const heading = sectionHeading[section] || sectionHeading.health;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{heading.title}</h1>
        <p className="text-muted-foreground text-xs">{heading.subtitle}</p>
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
          <p>{t("patient.myDetails.recordSetupMessage")}</p>
        </div>
      )}
    </div>
  );
}
