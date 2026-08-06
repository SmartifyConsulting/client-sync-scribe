import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmergencyPatientContext } from "./EmergencyPatientContext";
import { IncidentPhotos } from "./IncidentPhotos";
import {
  ClipboardList, HeartPulse, Pill, Stethoscope, NotebookPen, Droplet,
  Utensils, Activity, FlaskConical, Scan, Syringe, Bandage, ShieldAlert,
  Target, FileText, ArrowLeftRight, UserRound, AlertTriangle,
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
  "gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-white";

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
            <h2 className="text-lg font-extrabold">{admission?.patient_name ?? "Patient"}</h2>
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
        <TabsList className="w-full flex-wrap justify-start gap-1 bg-primary/10 p-1.5 h-auto rounded-none border-b-2 border-primary">
          <TabsTrigger value="overview" className={TAB_TRIGGER}><ClipboardList className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="vitals-obs" className={TAB_TRIGGER}><HeartPulse className="h-3.5 w-3.5" /> Vitals &amp; Observations</TabsTrigger>
          <TabsTrigger value="meds-fluids" className={TAB_TRIGGER}><Pill className="h-3.5 w-3.5" /> Medications &amp; Fluids</TabsTrigger>
          <TabsTrigger value="notes" className={TAB_TRIGGER}><NotebookPen className="h-3.5 w-3.5" /> Notes</TabsTrigger>
          <TabsTrigger value="results" className={TAB_TRIGGER}><FlaskConical className="h-3.5 w-3.5" /> Results</TabsTrigger>
          <TabsTrigger value="care" className={TAB_TRIGGER}><ShieldAlert className="h-3.5 w-3.5" /> Care &amp; Procedures</TabsTrigger>
          <TabsTrigger value="orders-handover" className={TAB_TRIGGER}><FileText className="h-3.5 w-3.5" /> Orders &amp; Handover</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="p-4 mt-0">
          <EmergencyPatientContext incidentId={incidentId} />
        </TabsContent>

        <TabsContent value="vitals-obs" className="p-4 mt-0">
          <Tabs defaultValue="vitals">
            <TabsList>
              <TabsTrigger value="vitals" className="text-xs gap-1.5"><HeartPulse className="h-3.5 w-3.5" /> Vital Signs Chart</TabsTrigger>
              <TabsTrigger value="observations" className="text-xs gap-1.5"><Activity className="h-3.5 w-3.5" /> Observation Charts</TabsTrigger>
            </TabsList>
            <TabsContent value="vitals" className="mt-0"><Empty>No vitals recorded yet.</Empty></TabsContent>
            <TabsContent value="observations" className="mt-0"><Empty>No specialised observation charts started yet.</Empty></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="meds-fluids" className="p-4 mt-0">
          <Tabs defaultValue="mar">
            <TabsList>
              <TabsTrigger value="mar" className="text-xs gap-1.5"><Pill className="h-3.5 w-3.5" /> Medication Administration</TabsTrigger>
              <TabsTrigger value="fluid-balance" className="text-xs gap-1.5"><Droplet className="h-3.5 w-3.5" /> Fluid Balance</TabsTrigger>
              <TabsTrigger value="nutrition" className="text-xs gap-1.5"><Utensils className="h-3.5 w-3.5" /> Intake &amp; Nutrition</TabsTrigger>
            </TabsList>
            <TabsContent value="mar" className="mt-0"><Empty>No medications administered yet.</Empty></TabsContent>
            <TabsContent value="fluid-balance" className="mt-0"><Empty>No fluid balance entries yet.</Empty></TabsContent>
            <TabsContent value="nutrition" className="mt-0"><Empty>No intake/nutrition data recorded yet.</Empty></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="notes" className="p-4 mt-0">
          <Tabs defaultValue="doctor-notes">
            <TabsList>
              <TabsTrigger value="doctor-notes" className="text-xs gap-1.5"><Stethoscope className="h-3.5 w-3.5" /> Doctor's Progress Notes</TabsTrigger>
              <TabsTrigger value="nursing-notes" className="text-xs gap-1.5"><NotebookPen className="h-3.5 w-3.5" /> Nursing Notes</TabsTrigger>
            </TabsList>
            <TabsContent value="doctor-notes" className="mt-0"><Empty>No progress notes recorded yet.</Empty></TabsContent>
            <TabsContent value="nursing-notes" className="mt-0"><Empty>No nursing notes recorded yet.</Empty></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="results" className="p-4 mt-0">
          <Tabs defaultValue="labs">
            <TabsList>
              <TabsTrigger value="labs" className="text-xs gap-1.5"><FlaskConical className="h-3.5 w-3.5" /> Laboratory Results</TabsTrigger>
              <TabsTrigger value="imaging" className="text-xs gap-1.5"><Scan className="h-3.5 w-3.5" /> Imaging</TabsTrigger>
            </TabsList>
            <TabsContent value="labs" className="mt-0"><Empty>No lab results filed yet.</Empty></TabsContent>
            <TabsContent value="imaging" className="mt-0">
              <IncidentPhotos incidentId={incidentId} readOnly />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="care" className="p-4 mt-0">
          <Tabs defaultValue="procedures">
            <TabsList>
              <TabsTrigger value="procedures" className="text-xs gap-1.5"><Syringe className="h-3.5 w-3.5" /> Procedures</TabsTrigger>
              <TabsTrigger value="wound-care" className="text-xs gap-1.5"><Bandage className="h-3.5 w-3.5" /> Wound Care</TabsTrigger>
              <TabsTrigger value="risk" className="text-xs gap-1.5"><ShieldAlert className="h-3.5 w-3.5" /> Risk Assessments</TabsTrigger>
              <TabsTrigger value="care-plan" className="text-xs gap-1.5"><Target className="h-3.5 w-3.5" /> Care Plan</TabsTrigger>
            </TabsList>
            <TabsContent value="procedures" className="mt-0"><Empty>No procedures logged yet.</Empty></TabsContent>
            <TabsContent value="wound-care" className="mt-0"><Empty>No wound care entries yet.</Empty></TabsContent>
            <TabsContent value="risk" className="mt-0"><Empty>No risk assessments completed yet.</Empty></TabsContent>
            <TabsContent value="care-plan" className="mt-0"><Empty>No care plan goals set yet.</Empty></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="orders-handover" className="p-4 mt-0">
          <Tabs defaultValue="orders">
            <TabsList>
              <TabsTrigger value="orders" className="text-xs gap-1.5"><FileText className="h-3.5 w-3.5" /> Orders</TabsTrigger>
              <TabsTrigger value="handover" className="text-xs gap-1.5"><ArrowLeftRight className="h-3.5 w-3.5" /> Handover Sheet</TabsTrigger>
            </TabsList>
            <TabsContent value="orders" className="mt-0"><Empty>No outstanding orders.</Empty></TabsContent>
            <TabsContent value="handover" className="mt-0"><Empty>No handover notes recorded yet.</Empty></TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
