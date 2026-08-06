import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { EmergencyPatientContext } from "./EmergencyPatientContext";
import { IncidentPhotos } from "./IncidentPhotos";
import {
  ClipboardList, HeartPulse, Pill, Stethoscope, NotebookPen, Droplet,
  Utensils, Activity, FlaskConical, Scan, Syringe, Bandage, ShieldAlert,
  Target, FileText, ArrowLeftRight,
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
};

const SECTION_TRIGGER =
  "px-4 py-3 hover:no-underline border-0 rounded-none data-[state=open]:bg-primary data-[state=open]:text-white [&_svg]:text-primary [&[data-state=open]_svg]:text-white";

function Empty({ children = "No data recorded yet." }: { children?: React.ReactNode }) {
  return <p className="px-1 py-3 text-sm text-muted-foreground italic">{children}</p>;
}

/**
 * Bedside chart for an admitted patient — the clipboard-at-the-foot-of-the-bed
 * view, replacing the pre-admission incident console (map / admission stepper
 * / triage assessment / timeline) once a patient has actually been admitted
 * to a ward. Grouped into accordion sections to keep the page scannable.
 */
export function AdmittedPatientChart({ incidentId }: { incidentId: string }) {
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
      <div className="rounded-2xl border-2 border-primary bg-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-primary px-4 py-3 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider opacity-90">Bedside Chart</p>
            <h2 className="text-lg font-extrabold">{admission?.patient_name ?? "Patient"}</h2>
          </div>
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            {wardName && <span className="rounded-full bg-white/15 px-3 py-1">{wardName}</span>}
            {admission?.bed_number && <span className="rounded-full bg-white/15 px-3 py-1">Bed {admission.bed_number}</span>}
          </div>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["clinical-summary"]} className="rounded-2xl border-2 border-primary bg-card overflow-hidden divide-y divide-primary/30">
        <AccordionItem value="clinical-summary" className="border-0">
          <AccordionTrigger className={SECTION_TRIGGER}>
            <span className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Clinical Summary</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2">
            <EmergencyPatientContext incidentId={incidentId} />
            {admission?.reason && (
              <p className="mt-2 text-sm"><span className="font-semibold">Presenting complaint:</span> {admission.reason}</p>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="vitals" className="border-0">
          <AccordionTrigger className={SECTION_TRIGGER}>
            <span className="flex items-center gap-2"><HeartPulse className="h-4 w-4" /> Vital Signs Chart</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2"><Empty>No vitals recorded yet.</Empty></AccordionContent>
        </AccordionItem>

        <AccordionItem value="mar" className="border-0">
          <AccordionTrigger className={SECTION_TRIGGER}>
            <span className="flex items-center gap-2"><Pill className="h-4 w-4" /> Medication Administration Record</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2"><Empty>No medications administered yet.</Empty></AccordionContent>
        </AccordionItem>

        <AccordionItem value="doctor-notes" className="border-0">
          <AccordionTrigger className={SECTION_TRIGGER}>
            <span className="flex items-center gap-2"><Stethoscope className="h-4 w-4" /> Doctor's Progress Notes</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2"><Empty>No progress notes recorded yet.</Empty></AccordionContent>
        </AccordionItem>

        <AccordionItem value="nursing-notes" className="border-0">
          <AccordionTrigger className={SECTION_TRIGGER}>
            <span className="flex items-center gap-2"><NotebookPen className="h-4 w-4" /> Nursing Notes</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2"><Empty>No nursing notes recorded yet.</Empty></AccordionContent>
        </AccordionItem>

        <AccordionItem value="fluid-balance" className="border-0">
          <AccordionTrigger className={SECTION_TRIGGER}>
            <span className="flex items-center gap-2"><Droplet className="h-4 w-4" /> Fluid Balance Chart</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2"><Empty>No fluid balance entries yet.</Empty></AccordionContent>
        </AccordionItem>

        <AccordionItem value="nutrition" className="border-0">
          <AccordionTrigger className={SECTION_TRIGGER}>
            <span className="flex items-center gap-2"><Utensils className="h-4 w-4" /> Intake &amp; Nutrition</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2"><Empty>No intake/nutrition data recorded yet.</Empty></AccordionContent>
        </AccordionItem>

        <AccordionItem value="observations" className="border-0">
          <AccordionTrigger className={SECTION_TRIGGER}>
            <span className="flex items-center gap-2"><Activity className="h-4 w-4" /> Observation Charts</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2"><Empty>No specialised observation charts started yet.</Empty></AccordionContent>
        </AccordionItem>

        <AccordionItem value="labs" className="border-0">
          <AccordionTrigger className={SECTION_TRIGGER}>
            <span className="flex items-center gap-2"><FlaskConical className="h-4 w-4" /> Laboratory Results</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2"><Empty>No lab results filed yet.</Empty></AccordionContent>
        </AccordionItem>

        <AccordionItem value="imaging" className="border-0">
          <AccordionTrigger className={SECTION_TRIGGER}>
            <span className="flex items-center gap-2"><Scan className="h-4 w-4" /> Imaging</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2">
            <IncidentPhotos incidentId={incidentId} readOnly />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="procedures" className="border-0">
          <AccordionTrigger className={SECTION_TRIGGER}>
            <span className="flex items-center gap-2"><Syringe className="h-4 w-4" /> Procedures</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2"><Empty>No procedures logged yet.</Empty></AccordionContent>
        </AccordionItem>

        <AccordionItem value="wound-care" className="border-0">
          <AccordionTrigger className={SECTION_TRIGGER}>
            <span className="flex items-center gap-2"><Bandage className="h-4 w-4" /> Wound Care</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2"><Empty>No wound care entries yet.</Empty></AccordionContent>
        </AccordionItem>

        <AccordionItem value="risk-assessments" className="border-0">
          <AccordionTrigger className={SECTION_TRIGGER}>
            <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Risk Assessments</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2"><Empty>No risk assessments completed yet.</Empty></AccordionContent>
        </AccordionItem>

        <AccordionItem value="care-plan" className="border-0">
          <AccordionTrigger className={SECTION_TRIGGER}>
            <span className="flex items-center gap-2"><Target className="h-4 w-4" /> Care Plan</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2"><Empty>No care plan goals set yet.</Empty></AccordionContent>
        </AccordionItem>

        <AccordionItem value="orders" className="border-0">
          <AccordionTrigger className={SECTION_TRIGGER}>
            <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Orders</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2"><Empty>No outstanding orders.</Empty></AccordionContent>
        </AccordionItem>

        <AccordionItem value="handover" className="border-0">
          <AccordionTrigger className={SECTION_TRIGGER}>
            <span className="flex items-center gap-2"><ArrowLeftRight className="h-4 w-4" /> Handover Sheet</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2"><Empty>No handover notes recorded yet.</Empty></AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
