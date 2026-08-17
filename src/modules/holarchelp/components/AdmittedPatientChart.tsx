import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncidentPhotos } from "./IncidentPhotos";
import { PatientOverviewTabs } from "./PatientOverviewTabs";
import { TestResultsPanel } from "./TestResultsPanel";
import { InpatientVitalsPanel } from "./InpatientVitalsPanel";
import {
  ClipboardList, HeartPulse, Pill, Stethoscope, NotebookPen, Droplet,
  Utensils, Activity, FlaskConical, Scan, ShieldAlert,
  FileText, ArrowLeftRight, UserRound, AlertTriangle, HeartHandshake,
  Send, LogOut,
} from "lucide-react";

type Admission = {
  id: string;
  hospital_id: string;
  ward_id: string | null;
  patient_id: string | null;
  patient_name: string;
  bed_number: string | null;
  admitted_at: string;
  status: string;
  reason: string | null;
  source: string | null;
};

type IncidentLite = {
  assigned_doctor_name?: string | null;
};

function Empty({ children = "No data recorded yet." }: { children?: React.ReactNode }) {
  return <p className="px-1 py-4 text-sm text-muted-foreground italic">{children}</p>;
}

const TAB_TRIGGER =
  "gap-1.5 data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-3 py-1.5";

/** "ambulance" source means the patient arrived via an emergency/SOS
 *  transport — labelled as an Emergency Admission rather than the raw
 *  source value. Other sources get a plainer, still-readable label. */
function admissionTypeLabel(source: string | null | undefined): string {
  if (source === "ambulance") return "Emergency Admission";
  if (source === "referral") return "Referral Admission";
  if (source === "walk_in") return "Walk-in Admission";
  return "Admission";
}

/**
 * Bedside chart for an admitted patient — the clipboard-at-the-foot-of-the-bed
 * view, replacing the pre-admission incident console (map / admission stepper
 * / triage assessment / timeline) once a patient has actually been admitted
 * to a ward. Related record types are grouped into tabs (with sub-tabs where
 * there's more than one closely-related record type) to keep the page
 * scannable at a glance.
 */
export function AdmittedPatientChart({ incidentId, incident }: { incidentId: string; incident?: IncidentLite }) {
  const [admission, setAdmission] = useState<Admission | null>(null);
  const [wardName, setWardName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("hospital_inpatient_admissions" as any)
      .select("*")
      .eq("incident_id", incidentId)
      .maybeSingle()
      .then(async ({ data }) => {
        if (cancelled) return;
        setAdmission((data as any) ?? null);
        const wardId = (data as any)?.ward_id;
        if (wardId) {
          const { data: ward } = await supabase
            .from("hospital_wards" as any)
            .select("name")
            .eq("id", wardId)
            .maybeSingle();
          if (!cancelled) setWardName((ward as any)?.name ?? null);
        }
      });
    return () => { cancelled = true; };
  }, [incidentId]);

  return (
    <div className="space-y-3">
      {/* Header: patient, ward/bed, admission type, admitting doctor */}
      <div className="rounded-2xl border-2 border-primary bg-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-primary px-4 py-3 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider opacity-90">Bedside Chart</p>
            <h2 className="text-lg font-extrabold text-white">{admission?.patient_name ?? "Patient"}</h2>
          </div>
          <div className="flex flex-wrap gap-2 text-sm font-semibold">
            {wardName && <span className="rounded-full bg-white/15 px-3 py-1">{wardName}</span>}
            {admission?.bed_number && <span className="rounded-full bg-white/15 px-3 py-1">Bed {admission.bed_number}</span>}
            <span className="rounded-full bg-white/15 px-3 py-1">{admissionTypeLabel(admission?.source)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b bg-muted/30 text-sm">
          <UserRound className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold text-foreground">Admitting Doctor:</span>
          <span className="text-foreground">{incident?.assigned_doctor_name || "Not yet assigned"}</span>
        </div>
        {/* Presenting complaint — the single most important line on the chart,
            so it sits at the top, always visible, never buried in a tab. */}
        <div className="flex items-start gap-2 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Presenting Complaint</p>
            <p className="text-base font-semibold text-foreground">{admission?.reason || "Not recorded"}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="rounded-2xl border-2 border-primary bg-card overflow-hidden">
        <TabsList className="w-full flex-wrap h-auto overflow-x-auto justify-start gap-1 bg-primary p-1.5 rounded-none border-b-2 border-primary">
          <TabsTrigger value="overview" className={TAB_TRIGGER}><ClipboardList className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="vitals" className={TAB_TRIGGER}><HeartPulse className="h-3.5 w-3.5" /> Vital Signs Chart</TabsTrigger>
          <TabsTrigger value="observations" className={TAB_TRIGGER}><Activity className="h-3.5 w-3.5" /> Observation Charts</TabsTrigger>
          <TabsTrigger value="mar" className={TAB_TRIGGER}><Pill className="h-3.5 w-3.5" /> Medication Administration</TabsTrigger>
          <TabsTrigger value="fluid-balance" className={TAB_TRIGGER}><Droplet className="h-3.5 w-3.5" /> Fluid Balance</TabsTrigger>
          <TabsTrigger value="nutrition" className={TAB_TRIGGER}><Utensils className="h-3.5 w-3.5" /> Intake &amp; Nutrition</TabsTrigger>
          <TabsTrigger value="doctor-notes" className={TAB_TRIGGER}><Stethoscope className="h-3.5 w-3.5" /> Doctor's Progress Notes</TabsTrigger>
          <TabsTrigger value="nursing-notes" className={TAB_TRIGGER}><NotebookPen className="h-3.5 w-3.5" /> Nursing Notes</TabsTrigger>
          <TabsTrigger value="labs" className={TAB_TRIGGER}><FlaskConical className="h-3.5 w-3.5" /> Laboratory Results</TabsTrigger>
          <TabsTrigger value="imaging" className={TAB_TRIGGER}><Scan className="h-3.5 w-3.5" /> Imaging</TabsTrigger>
          <TabsTrigger value="care-activities" className={TAB_TRIGGER}><HeartHandshake className="h-3.5 w-3.5" /> Care Activities</TabsTrigger>
          <TabsTrigger value="interventions" className={TAB_TRIGGER}><Activity className="h-3.5 w-3.5" /> Interventions</TabsTrigger>
          <TabsTrigger value="referrals" className={TAB_TRIGGER}><Send className="h-3.5 w-3.5" /> Referrals</TabsTrigger>
          <TabsTrigger value="handover" className={TAB_TRIGGER}><ArrowLeftRight className="h-3.5 w-3.5" /> Handover</TabsTrigger>
          <TabsTrigger value="discharge" className={TAB_TRIGGER}><LogOut className="h-3.5 w-3.5" /> Discharge</TabsTrigger>
          <TabsTrigger value="orders-handover" className={TAB_TRIGGER}><FileText className="h-3.5 w-3.5" /> Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="p-4 mt-0">
          <PatientOverviewTabs incidentId={incidentId} patientId={admission?.patient_id} patientName={admission?.patient_name} />
        </TabsContent>

        <TabsContent value="vitals" className="p-4 mt-0">
          <InpatientVitalsPanel admissionId={admission?.id ?? null} />
        </TabsContent>
        <TabsContent value="observations" className="p-4 mt-0"><Empty>No specialised observation charts started yet.</Empty></TabsContent>

        <TabsContent value="mar" className="p-4 mt-0"><Empty>No medications administered yet.</Empty></TabsContent>
        <TabsContent value="fluid-balance" className="p-4 mt-0"><Empty>No fluid balance entries yet.</Empty></TabsContent>
        <TabsContent value="nutrition" className="p-4 mt-0"><Empty>No intake/nutrition data recorded yet.</Empty></TabsContent>

        <TabsContent value="doctor-notes" className="p-4 mt-0"><Empty>No progress notes recorded yet.</Empty></TabsContent>
        <TabsContent value="nursing-notes" className="p-4 mt-0"><Empty>No nursing notes recorded yet.</Empty></TabsContent>

        <TabsContent value="labs" className="p-4 mt-0"><TestResultsPanel patientId={admission?.patient_id} /></TabsContent>
        <TabsContent value="imaging" className="p-4 mt-0">
          <IncidentPhotos incidentId={incidentId} readOnly />
        </TabsContent>

        <TabsContent value="care-activities" className="p-4 mt-0"><Empty>No care activities recorded yet.</Empty></TabsContent>
        <TabsContent value="interventions" className="p-4 mt-0"><Empty>No interventions recorded yet.</Empty></TabsContent>
        <TabsContent value="referrals" className="p-4 mt-0"><Empty>No referrals made yet.</Empty></TabsContent>
        <TabsContent value="handover" className="p-4 mt-0"><Empty>No handover notes recorded yet.</Empty></TabsContent>
        <TabsContent value="discharge" className="p-4 mt-0"><Empty>No discharge planning started yet.</Empty></TabsContent>

        <TabsContent value="orders-handover" className="p-4 mt-0">
          <Empty>No outstanding orders.</Empty>
        </TabsContent>
      </Tabs>
    </div>
  );
}
