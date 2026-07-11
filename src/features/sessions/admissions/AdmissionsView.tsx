import { useState } from "react";
import { useHospitalAdmissions, useAdmissionVitals, useAdmissionMedications, useAdmissionLabResults, useAdmissionImaging, type HospitalAdmission } from "@/hooks/useHospitalAdmissions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Hospital, FileText, Plus, Activity, Pill, FlaskConical, Scan, Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AddVitalsDialog } from "./AddVitalsDialog";
import { AddMedicationDialog } from "./AddMedicationDialog";
import { AddLabResultDialog } from "./AddLabResultDialog";
import { AddImagingDialog } from "./AddImagingDialog";
import { UploadAdmissionDialog } from "./UploadAdmissionDialog";
import { ManualLogAdmissionDialog } from "./ManualLogAdmissionDialog";
import { Upload } from "lucide-react";
import { RateNurseControl } from "@/components/admissions/RateNurseControl";

interface Props {
  patientId: string;
  patientHeight?: number | null;
  patientWeight?: number | null;
  canEdit?: boolean;
}

function AdmissionDetail({ admission, canEdit, defaultHeight, defaultWeight }: { admission: HospitalAdmission; canEdit: boolean; defaultHeight?: number | null; defaultWeight?: number | null }) {
  const { data: vitals = [] } = useAdmissionVitals(admission.id);
  const { data: meds = [] } = useAdmissionMedications(admission.id);
  const { data: labs = [] } = useAdmissionLabResults(admission.id);
  const { data: imaging = [] } = useAdmissionImaging(admission.id);
  const [showVitals, setShowVitals] = useState(false);
  const [showMeds, setShowMeds] = useState(false);
  const [showLabs, setShowLabs] = useState(false);
  const [showImaging, setShowImaging] = useState(false);

  const { data: doc } = useQuery({
    queryKey: ["admission-document", admission.document_id],
    enabled: !!admission.document_id,
    queryFn: async () => {
      const { data } = await supabase.from("documents").select("id, name, media_url").eq("id", admission.document_id!).maybeSingle();
      return data;
    },
  });

  return (
    <Card className="p-4 border-2 border-primary/20">
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Hospital className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">
              {(admission as any).title || admission.diagnosis || admission.hospital || "Admission"}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {admission.hospital ? `${admission.hospital} · ` : ""}
              Admitted {format(new Date(admission.admission_date), "dd MMM yyyy")}
              {admission.discharge_date && ` · Discharged ${format(new Date(admission.discharge_date), "dd MMM yyyy")}`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Logged {format(new Date((admission as any).created_at || admission.admission_date), "dd MMM yyyy HH:mm")}
            </p>
          </div>
        </div>
        <Badge variant={admission.status === "admitted" ? "default" : "secondary"} className="shrink-0">{admission.status}</Badge>
      </div>

      {doc && (
        <Button variant="outline" size="sm" className="mb-3" asChild>
          <a href={doc.media_url || `#doc-${doc.id}`} target="_blank" rel="noreferrer">
            <FileText className="h-4 w-4 mr-1" /> View Admission Form
          </a>
        </Button>
      )}

      <Accordion type="multiple" className="w-full">
        <AccordionItem value="vitals">
          <AccordionTrigger className="text-xs"><span className="flex items-center gap-2"><Activity className="h-4 w-4" /> Vitals ({vitals.length})</span></AccordionTrigger>
          <AccordionContent>
            {canEdit && <Button size="sm" variant="outline" className="mb-2" onClick={() => setShowVitals(true)}><Plus className="h-4 w-4 mr-1" /> Add Vitals</Button>}
            <div className="space-y-2">
              {vitals.map((v: any) => (
                <div key={v.id} className="text-xs p-2 rounded bg-muted/40">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(v.recorded_at), "dd MMM yyyy HH:mm")}
                    {v.nurse_name_snapshot && <span> · Nurse: {v.nurse_name_snapshot}</span>}
                  </p>
                  <p>HR: {v.heart_rate || "-"} bpm · BP: {v.bp_systolic || "-"}/{v.bp_diastolic || "-"} · SpO₂: {v.spo2 || "-"}% · Temp: {v.temperature_c || "-"}°C · BMI: {v.bmi || "-"}</p>
                  {v.notes && <p className="text-muted-foreground mt-1">{v.notes}</p>}
                  <RateNurseControl
                    admissionId={admission.id}
                    recordTable="admission_vitals"
                    recordId={v.id}
                    nurseId={v.nurse_id ?? null}
                    nurseName={v.nurse_name_snapshot}
                  />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="meds">
          <AccordionTrigger className="text-xs"><span className="flex items-center gap-2"><Pill className="h-4 w-4" /> Active Medications ({meds.length})</span></AccordionTrigger>
          <AccordionContent>
            {canEdit && <Button size="sm" variant="outline" className="mb-2" onClick={() => setShowMeds(true)}><Plus className="h-4 w-4 mr-1" /> Add Medication</Button>}
            <div className="space-y-2">
              {meds.map((m: any) => (
                <div key={m.id} className="text-xs p-2 rounded bg-muted/40">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-muted-foreground">{m.dosage} · {m.frequency}</p>
                  {m.nurse_name_snapshot && <p className="text-xs text-muted-foreground">Nurse: {m.nurse_name_snapshot}</p>}
                  <RateNurseControl admissionId={admission.id} recordTable="admission_medications" recordId={m.id} nurseId={m.nurse_id ?? null} nurseName={m.nurse_name_snapshot} />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="labs">
          <AccordionTrigger className="text-xs"><span className="flex items-center gap-2"><FlaskConical className="h-4 w-4" /> Lab Results ({labs.length})</span></AccordionTrigger>
          <AccordionContent>
            {canEdit && <Button size="sm" variant="outline" className="mb-2" onClick={() => setShowLabs(true)}><Plus className="h-4 w-4 mr-1" /> Add Lab Result</Button>}
            <div className="space-y-2">
              {labs.map((l: any) => (
                <div key={l.id} className="text-xs p-2 rounded bg-muted/40">
                  <p className="font-medium">{l.test_name}</p>
                  <p>{l.result_value} {l.units} {l.reference_range && <span className="text-muted-foreground">(ref: {l.reference_range})</span>}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(l.result_date), "dd MMM yyyy")}
                    {l.nurse_name_snapshot && <span> · Nurse: {l.nurse_name_snapshot}</span>}
                  </p>
                  {l.attachment_url && <a href={l.attachment_url} target="_blank" rel="noreferrer" className="text-primary text-xs inline-flex items-center gap-1"><ExternalLink className="h-2 w-2" /> View attachment</a>}
                  <RateNurseControl admissionId={admission.id} recordTable="admission_lab_results" recordId={l.id} nurseId={l.nurse_id ?? null} nurseName={l.nurse_name_snapshot} />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="imaging">
          <AccordionTrigger className="text-xs"><span className="flex items-center gap-2"><Scan className="h-4 w-4" /> Imaging ({imaging.length})</span></AccordionTrigger>
          <AccordionContent>
            {canEdit && <Button size="sm" variant="outline" className="mb-2" onClick={() => setShowImaging(true)}><Plus className="h-4 w-4 mr-1" /> Add Imaging</Button>}
            <div className="space-y-2">
              {imaging.map((i: any) => (
                <div key={i.id} className="text-xs p-2 rounded bg-muted/40">
                  <p className="font-medium">{i.modality} · {i.body_region}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(i.performed_at), "dd MMM yyyy")}
                    {i.nurse_name_snapshot && <span> · Nurse: {i.nurse_name_snapshot}</span>}
                  </p>
                  {i.summary && <p className="mt-1">{i.summary}</p>}
                  {i.pacs_link && <a href={i.pacs_link} target="_blank" rel="noreferrer" className="text-primary text-xs inline-flex items-center gap-1"><ExternalLink className="h-2 w-2" /> PACS</a>}
                  {i.attachment_url && <a href={i.attachment_url} target="_blank" rel="noreferrer" className="text-primary text-xs inline-flex items-center gap-1 ml-2"><ExternalLink className="h-2 w-2" /> PDF</a>}
                  <RateNurseControl admissionId={admission.id} recordTable="admission_imaging" recordId={i.id} nurseId={i.nurse_id ?? null} nurseName={i.nurse_name_snapshot} />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <AddVitalsDialog open={showVitals} onOpenChange={setShowVitals} admissionId={admission.id} hospitalId={admission.hospital_provider_id} defaultHeight={defaultHeight} defaultWeight={defaultWeight} />
      <AddMedicationDialog open={showMeds} onOpenChange={setShowMeds} admissionId={admission.id} hospitalId={admission.hospital_provider_id} />
      <AddLabResultDialog open={showLabs} onOpenChange={setShowLabs} admissionId={admission.id} hospitalId={admission.hospital_provider_id} />
      <AddImagingDialog open={showImaging} onOpenChange={setShowImaging} admissionId={admission.id} hospitalId={admission.hospital_provider_id} />
    </Card>
  );
}

export function AdmissionsView({ patientId, patientHeight, patientWeight, canEdit = false }: Props) {
  const { data: admissions = [], isLoading } = useHospitalAdmissions(patientId);
  const [showUpload, setShowUpload] = useState(false);
  const [showManual, setShowManual] = useState(false);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Hospital Admissions</h3>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowManual(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Log Admission
            </Button>
            <Button size="sm" onClick={() => setShowUpload(true)} className="gap-1">
              <Upload className="h-4 w-4" /> Upload Admission Form
            </Button>
          </div>
        )}
      </div>

      {admissions.length === 0 ? (
        <Card className="p-8 text-center">
          <Hospital className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No hospital admissions on record.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Entries are created automatically when a doctor saves a Hospital Admission Form, or you can upload one yourself.
          </p>
        </Card>
      ) : (
        admissions.map((a) => (
          <AdmissionDetail key={a.id} admission={a} canEdit={canEdit} defaultHeight={patientHeight} defaultWeight={patientWeight} />
        ))
      )}

      <UploadAdmissionDialog open={showUpload} onOpenChange={setShowUpload} patientId={patientId} />
      <ManualLogAdmissionDialog open={showManual} onOpenChange={setShowManual} patientId={patientId} />
    </div>
  );
}
