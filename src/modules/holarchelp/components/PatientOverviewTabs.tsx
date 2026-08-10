import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmergencyPatientContext } from "./EmergencyPatientContext";
import { TestResultsPanel } from "./TestResultsPanel";
import { DoctorsOnProfile } from "@/features/patients/components/DoctorsOnProfile";
import { LayoutGrid, User, HeartPulse, Users, FlaskConical } from "lucide-react";

type PatientRow = {
  id: string;
  name: string;
  dob: string | null;
  gender: string | null;
  id_passport_number: string | null;
  phone: string | null;
  email: string | null;
  physical_address: string | null;
  marital_status: string | null;
  occupation: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  blood_type: string | null;
  allergies: string | null;
  allergies_structured: Array<{ id: string; name: string; severity: string }> | null;
  chronic_medications: string | null;
  is_chronic: boolean | null;
  general_practitioner: string | null;
  medical_aid: string | null;
  medical_aid_number: string | null;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value || "—"}</p>
    </div>
  );
}

const SUB_TAB =
  "gap-1.5 data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-1.5 py-1 sm:px-3 sm:py-1.5";

/**
 * The bedside chart's Overview tab — mirrors the same information groupings
 * a doctor sees on the My Patients profile screen (Overview / Personal
 * Information / Medical Information / Healthcare Providers / Test Results),
 * so hospital staff don't have to leave the chart to find it.
 */
export function PatientOverviewTabs({ incidentId, patientId, patientName }: {
  incidentId: string;
  patientId: string | null | undefined;
  patientName: string | undefined;
}) {
  const [patient, setPatient] = useState<PatientRow | null>(null);

  useEffect(() => {
    if (!patientId) { setPatient(null); return; }
    let cancelled = false;
    supabase
      .from("patients" as any)
      .select("id, name, dob, gender, id_passport_number, phone, email, physical_address, marital_status, occupation, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, blood_type, allergies, allergies_structured, chronic_medications, is_chronic, general_practitioner, medical_aid, medical_aid_number")
      .eq("id", patientId)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setPatient((data as any) ?? null); });
    return () => { cancelled = true; };
  }, [patientId]);

  return (
    <Tabs defaultValue="overview">
      <TabsList className="bg-neutral-600 flex-wrap h-auto gap-1">
        <TabsTrigger value="overview" className={SUB_TAB}><LayoutGrid className="h-3.5 w-3.5" /> Overview</TabsTrigger>
        <TabsTrigger value="personal" className={SUB_TAB}><User className="h-3.5 w-3.5" /> Personal Information</TabsTrigger>
        <TabsTrigger value="medical" className={SUB_TAB}><HeartPulse className="h-3.5 w-3.5" /> Medical Information</TabsTrigger>
        <TabsTrigger value="providers" className={SUB_TAB}><Users className="h-3.5 w-3.5" /> Healthcare Providers</TabsTrigger>
        <TabsTrigger value="results" className={SUB_TAB}><FlaskConical className="h-3.5 w-3.5" /> Test Results</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-3">
        <EmergencyPatientContext incidentId={incidentId} />
      </TabsContent>

      <TabsContent value="personal" className="mt-3">
        {!patient ? (
          <p className="text-sm text-muted-foreground italic">No patient record linked.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Full Name" value={patient.name} />
            <Field label="Date of Birth" value={patient.dob ? new Date(patient.dob).toLocaleDateString() : null} />
            <Field label="Gender" value={patient.gender} />
            <Field label="ID / Passport Number" value={patient.id_passport_number} />
            <Field label="Phone" value={patient.phone} />
            <Field label="Email" value={patient.email} />
            <Field label="Address" value={patient.physical_address} />
            <Field label="Marital Status" value={patient.marital_status} />
            <Field label="Occupation" value={patient.occupation} />
            <Field label="Emergency Contact" value={patient.emergency_contact_name} />
            <Field label="Emergency Contact Phone" value={patient.emergency_contact_phone} />
            <Field label="Relationship" value={patient.emergency_contact_relationship} />
          </div>
        )}
      </TabsContent>

      <TabsContent value="medical" className="mt-3">
        {!patient ? (
          <p className="text-sm text-muted-foreground italic">No patient record linked.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Blood Type" value={patient.blood_type} />
            <Field
              label="Allergies"
              value={
                patient.allergies_structured && patient.allergies_structured.length > 0
                  ? patient.allergies_structured.map((a) => `${a.name} (${a.severity})`).join(", ")
                  : patient.allergies
              }
            />
            <Field label="Chronic Medications" value={patient.chronic_medications} />
            <Field label="Chronic Condition" value={patient.is_chronic ? "Yes" : "No"} />
            <Field label="General Practitioner" value={patient.general_practitioner} />
            <Field label="Medical Aid" value={patient.medical_aid} />
            <Field label="Medical Aid Number" value={patient.medical_aid_number} />
          </div>
        )}
      </TabsContent>

      <TabsContent value="providers" className="mt-3">
        {patientId ? (
          <DoctorsOnProfile patientId={patientId} patientName={patientName ?? patient?.name ?? ""} />
        ) : (
          <p className="text-sm text-muted-foreground italic">No patient record linked.</p>
        )}
      </TabsContent>

      <TabsContent value="results" className="mt-3">
        <TestResultsPanel patientId={patientId} />
      </TabsContent>
    </Tabs>
  );
}
