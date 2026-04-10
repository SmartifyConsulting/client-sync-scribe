import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PatientDetailsEditor } from "@/components/patients/PatientDetailsEditor";
import { Patient } from "@/hooks/usePatients";
import { useToast } from "@/hooks/use-toast";
import { useMyRewards } from "@/hooks/usePatientRewards";
import holarcLogo from "@/assets/holarc-logo.png";
import vulaVouchersLogo from "@/assets/vula-vouchers-logo.png";

function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>();
  const startRef = useRef<number>();

  useEffect(() => {
    if (target <= 0) { setCount(0); return; }
    startRef.current = undefined;
    const duration = 1500;
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);

  return <span>{count}</span>;
}

export default function MyDetails() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
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
          ice_contacts: Array.isArray(data.ice_contacts) ? data.ice_contacts as unknown as Patient["ice_contacts"] : [],
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

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Holarchive</h1>
        <p className="text-muted-foreground text-[12px]">View and update your personal and medical information</p>
      </div>

      <PatientDetailsEditor patient={patient} onSave={handleSave} isSelfService userEmail={userEmail} lollipopCount={lollipopCount} rewardsLoading={rewardsLoading} />
    </div>
  );
}
