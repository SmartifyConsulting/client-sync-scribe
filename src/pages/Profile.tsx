import { useState, useEffect } from "react";
import { Loader2, Settings2 } from "lucide-react";
import { PatientDetailsEditor } from "@/components/patients/PatientDetailsEditor";
import { Patient } from "@/hooks/usePatients";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

function AutoCreatePatientFallback({ user, onCreated }: { user: any; onCreated: (record: Patient) => void }) {
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const { data: profileData } = await supabase.from("profiles").select("full_name, mobile_number").eq("id", user.id).single();
      const { data, error } = await supabase.from("patients").insert({
        user_id: user.id,
        patient_user_id: user.id,
        name: profileData?.full_name || "My Record",
        email: user.email || null,
        phone: profileData?.mobile_number || null,
      }).select().single();
      if (error) throw error;
      if (data) {
        onCreated({
          ...data,
          surgeries: [],
          pharmacies: [],
          family_history: [],
        } as Patient);
        toast({ title: "Record created", description: "Your Holarchive has been initialized." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4">
      <p className="text-muted-foreground">No clinical record found. Create your Holarchive to start managing your health information.</p>
      <Button onClick={handleCreate} disabled={creating}>
        {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : "Create My Holarchive"}
      </Button>
    </div>
  );
}

export default function Profile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { role } = useUserRole();
  const { profile, loading } = useProfile();
  const navigate = useNavigate();
  const [patientRecord, setPatientRecord] = useState<Patient | null>(null);
  const [patientLoading, setPatientLoading] = useState(false);

  const isDoctor = role === "doctor";
  const isPatient = role === "patient";

  // Fetch patient record for Holarchive
  useEffect(() => {
    if (!user) return;
    const fetchPatientRecord = async () => {
      setPatientLoading(true);
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("*")
          .eq("patient_user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setPatientRecord({
            ...data,
            surgeries: Array.isArray(data.surgeries) ? data.surgeries as unknown as Patient["surgeries"] : [],
            pharmacies: Array.isArray(data.pharmacies) ? data.pharmacies as unknown as Patient["pharmacies"] : [],
            family_history: Array.isArray(data.family_history) ? data.family_history as unknown as Patient["family_history"] : [],
          } as Patient);
        }
      } catch (err) {
        console.error("Error fetching patient record:", err);
      } finally {
        setPatientLoading(false);
      }
    };
    fetchPatientRecord();
  }, [user]);

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {isPatient ? "My Holarchive" : "Profile"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isPatient ? "Manage your health information" : "View your profile"}
        </p>
      </div>

      {isPatient ? (
        patientLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : patientRecord ? (
          <PatientDetailsEditor
            patient={patientRecord}
            onSave={async (updates: Partial<Patient>) => {
              const { error } = await supabase
                .from("patients")
                .update(updates as any)
                .eq("id", patientRecord.id);
              if (error) {
                toast({ title: "Error saving", description: error.message, variant: "destructive" });
                throw error;
              }
              setPatientRecord((prev) => prev ? { ...prev, ...updates } : prev);
              toast({ title: "Saved", description: "Your details have been updated." });
            }}
            isSelfService
          />
        ) : (
          <AutoCreatePatientFallback
            user={user}
            onCreated={(record) => setPatientRecord(record)}
          />
        )
      ) : (
        <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4">
          <Settings2 className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">Account settings have moved</p>
            <p className="text-sm text-muted-foreground mt-1">All your personal, practice, and account settings are now in Settings.</p>
          </div>
          <Button onClick={() => navigate("/settings")}>
            Go to Settings
          </Button>
        </div>
      )}
    </div>
  );
}
