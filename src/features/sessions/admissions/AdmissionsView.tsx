import { useMemo, useState } from "react";
import {
  useHospitalAdmissions,
  useAdmissionVitals,
  useAdmissionMedications,
  useAdmissionLabResults,
  useAdmissionImaging,
  useAdmissionNurseShifts,
  useAdmissionMealLog,
  useIsHospitalStaffForAdmission,
  useStartNurseShift,
  useLogMeal,
  useUpdateAdmission,
  type HospitalAdmission,
  type MealSlot,
} from "@/hooks/useHospitalAdmissions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { SectionCountPill } from "@/components/ui/section-accordion";
import { SectionHeader } from "@/features/patients/components/sectionStyles";
import { Badge } from "@/components/ui/badge";
import {
  Hospital, FileText, Plus, Activity, Pill, FlaskConical, Scan, Loader2, ExternalLink,
  Stethoscope, UserCog, Clock3, Users, Phone, DoorOpen, NotebookPen, UtensilsCrossed, Check, X as XIcon, Search,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { AddVitalsDialog } from "./AddVitalsDialog";
import { AddMedicationDialog } from "./AddMedicationDialog";
import { AddLabResultDialog } from "./AddLabResultDialog";
import { AddImagingDialog } from "./AddImagingDialog";
import { UploadAdmissionDialog } from "./UploadAdmissionDialog";
import { Upload } from "lucide-react";
import { RateNurseControl } from "@/components/admissions/RateNurseControl";

interface Props {
  patientId: string;
  patientHeight?: number | null;
  patientWeight?: number | null;
  canEdit?: boolean;
}

interface PatientContact {
  patientName: string | null;
  allergies: string | null;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  nextOfKinRelationship: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
}

/** Wristband QR — deliberately minimal: only what's safe to print and wear. */
function useWristbandQr(admission: HospitalAdmission, patientName: string | null, allergies: string | null, doctorName: string | null | undefined) {
  return useQuery({
    queryKey: ["admission-wristband-qr", admission.id, patientName, allergies, doctorName],
    queryFn: async () => {
      const lines = [
        `Name: ${patientName || "Unknown"}`,
        `Allergies: ${allergies || "None recorded"}`,
        `Procedure: ${admission.procedure_description || admission.diagnosis || "Not specified"}`,
        `Doctor: ${doctorName || "Not assigned"}`,
        `Admitted: ${format(new Date(admission.admission_date), "dd MMM yyyy")}`,
      ];
      return QRCode.toDataURL(lines.join("\n"), { width: 160, margin: 1 });
    },
  });
}

const DIET_PRESETS = ["Regular", "Liquid Diet", "Soft Diet", "Diabetic", "Low Sodium", "NPO (Nil by Mouth)"];
const MEAL_SLOTS: { value: MealSlot; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

function useDoctorName(doctorId?: string | null) {
  return useQuery({
    queryKey: ["doctor-name", doctorId],
    enabled: !!doctorId,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", doctorId!).maybeSingle();
      return data?.full_name || null;
    },
  });
}

function useHospitalVisitingHours(hospitalProviderId?: string | null) {
  return useQuery({
    queryKey: ["hospital-visiting-hours", hospitalProviderId],
    enabled: !!hospitalProviderId,
    queryFn: async () => {
      const { data } = await (supabase.from("holarchelp_hospitals") as any)
        .select("visiting_hours")
        .eq("id", hospitalProviderId!)
        .maybeSingle();
      return (data?.visiting_hours as string | null) || null;
    },
  });
}

function useHospitalDoctors(hospitalProviderId?: string | null) {
  return useQuery({
    queryKey: ["hospital-affiliated-doctors", hospitalProviderId],
    enabled: !!hospitalProviderId,
    queryFn: async () => {
      const { data } = await (supabase.from("hospital_doctor_affiliations") as any)
        .select("doctor_id, profiles:doctor_id(id, full_name)")
        .eq("hospital_id", hospitalProviderId!);
      return ((data || []) as any[])
        .map((r) => ({ id: r.doctor_id as string, name: (r.profiles?.full_name as string) || "Unnamed doctor" }))
        .filter((d) => d.id);
    },
  });
}

function useHospitalStaffMembers(hospitalProviderId?: string | null) {
  return useQuery({
    queryKey: ["hospital-staff-members", hospitalProviderId],
    enabled: !!hospitalProviderId,
    queryFn: async () => {
      const { data } = await (supabase.from("holarchelp_hospital_members") as any)
        .select("user_id, role, invited_name, profiles:user_id(id, full_name)")
        .eq("hospital_id", hospitalProviderId!)
        .not("user_id", "is", null);
      return ((data || []) as any[]).map((r) => ({
        id: r.user_id as string,
        name: (r.profiles?.full_name as string) || r.invited_name || "Staff member",
        role: r.role as string,
      }));
    },
  });
}

function NextOfKinBanner({ contact }: { contact: PatientContact }) {
  const hasNok = !!(contact.nextOfKinName || contact.nextOfKinPhone);
  const ecDiffersFromNok =
    !!contact.emergencyContactName &&
    contact.emergencyContactName.trim().toLowerCase() !== (contact.nextOfKinName || "").trim().toLowerCase();

  if (!hasNok && !ecDiffersFromNok) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
      {hasNok && (
        <span className="flex items-center gap-1.5 text-foreground">
          <Users className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-semibold">Next of Kin:</span>
          {contact.nextOfKinName}
          {contact.nextOfKinRelationship && ` (${contact.nextOfKinRelationship})`}
          {contact.nextOfKinPhone && (
            <a href={`tel:${contact.nextOfKinPhone}`} className="text-primary inline-flex items-center gap-1 ml-1">
              <Phone className="h-3 w-3" /> {contact.nextOfKinPhone}
            </a>
          )}
        </span>
      )}
      {ecDiffersFromNok && (
        <span className="flex items-center gap-1.5 text-foreground">
          <Users className="h-3.5 w-3.5 text-destructive shrink-0" />
          <span className="font-semibold">Emergency Contact:</span>
          {contact.emergencyContactName}
          {contact.emergencyContactRelationship && ` (${contact.emergencyContactRelationship})`}
          {contact.emergencyContactPhone && (
            <a href={`tel:${contact.emergencyContactPhone}`} className="text-primary inline-flex items-center gap-1 ml-1">
              <Phone className="h-3 w-3" /> {contact.emergencyContactPhone}
            </a>
          )}
        </span>
      )}
    </div>
  );
}

function AdmissionDetail({
  admission,
  canEdit,
  defaultHeight,
  defaultWeight,
  contact,
}: {
  admission: HospitalAdmission;
  canEdit: boolean;
  defaultHeight?: number | null;
  defaultWeight?: number | null;
  contact: PatientContact;
}) {
  const { data: vitals = [] } = useAdmissionVitals(admission.id);
  const { data: meds = [] } = useAdmissionMedications(admission.id);
  const { data: labs = [] } = useAdmissionLabResults(admission.id);
  const { data: imaging = [] } = useAdmissionImaging(admission.id);
  const { data: shifts = [] } = useAdmissionNurseShifts(admission.id);
  const { data: meals = [] } = useAdmissionMealLog(admission.id);
  const { data: isHospitalStaff = false } = useIsHospitalStaffForAdmission(admission.id);
  const { data: admittingDoctorName } = useDoctorName(admission.doctor_id);
  const { data: onCallDoctorName } = useDoctorName(admission.doctor_on_call_id);
  const { data: hospitalVisitingHours } = useHospitalVisitingHours(admission.hospital_provider_id);
  const { data: hospitalDoctors = [] } = useHospitalDoctors(admission.hospital_provider_id);
  const { data: staffMembers = [] } = useHospitalStaffMembers(admission.hospital_provider_id);

  const updateAdmission = useUpdateAdmission(admission.id);
  const startShift = useStartNurseShift(admission.id);
  const logMeal = useLogMeal(admission.id);

  const { data: wristbandQr } = useWristbandQr(admission, contact.patientName, contact.allergies, admittingDoctorName);

  const [expanded, setExpanded] = useState(true);
  const [showVitals, setShowVitals] = useState(false);
  const [showMeds, setShowMeds] = useState(false);
  const [showLabs, setShowLabs] = useState(false);
  const [showImaging, setShowImaging] = useState(false);
  const [needsNote, setNeedsNote] = useState(admission.patient_care_notes || "");
  const [shiftNurseId, setShiftNurseId] = useState("");
  const [shiftNotes, setShiftNotes] = useState("");
  const [mealSlot, setMealSlot] = useState<MealSlot>("breakfast");
  const [mealAte, setMealAte] = useState<boolean | null>(null);
  const [mealNotes, setMealNotes] = useState("");

  const currentShift = useMemo(() => {
    const open = shifts.find((s) => !s.shift_end);
    return open || shifts[0] || null;
  }, [shifts]);

  const visitingHours = admission.visiting_hours_override || hospitalVisitingHours;

  const { data: doc } = useQuery({
    queryKey: ["admission-document", admission.document_id],
    enabled: !!admission.document_id,
    queryFn: async () => {
      const { data } = await supabase.from("documents").select("id, name, media_url").eq("id", admission.document_id!).maybeSingle();
      return data;
    },
  });

  const handleSaveNeedsNote = () => {
    updateAdmission.mutate({ patient_care_notes: needsNote });
  };

  const handleStartShift = () => {
    const nurse = staffMembers.find((s) => s.id === shiftNurseId);
    if (!nurse) return;
    startShift.mutate(
      { nurseUserId: nurse.id, nurseName: nurse.name, handoverNotes: shiftNotes || undefined },
      { onSuccess: () => { setShiftNurseId(""); setShiftNotes(""); } },
    );
  };

  const handleLogMeal = () => {
    const nurse = staffMembers.find((s) => s.role === "nurse") || null;
    logMeal.mutate(
      { mealSlot, ate: mealAte, notes: mealNotes || undefined, nurseName: nurse?.name },
      { onSuccess: () => { setMealAte(null); setMealNotes(""); } },
    );
  };

  return (
    <Card className="overflow-hidden border-2 border-primary/20 p-0">
      {/* === Admission Banner === */}
      <div className="bg-primary/5 border-b border-primary/20 p-1 space-y-1">
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex items-start gap-1.5 min-w-0">
            <div className="h-4 w-4 rounded bg-primary flex items-center justify-center shrink-0">
              <Hospital className="h-2.5 w-2.5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-primary-dark truncate uppercase tracking-wide">
                {admission.hospital || "Hospital"}
              </h2>
              <p className="text-[10px] font-medium text-foreground truncate">
                {(admission as any).title || admission.diagnosis || "Admission"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Admitted {format(new Date(admission.admission_date), "dd MMM yyyy")}
                {admission.discharge_date && ` · Discharged ${format(new Date(admission.discharge_date), "dd MMM yyyy")}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {wristbandQr && (
              <img
                src={wristbandQr}
                alt="Wristband QR — Name, allergies, procedure, doctor, admission date"
                title="Scan for wristband details: Name, Allergies, Procedure, Doctor, Admission Date"
                style={{ width: "0.9cm", height: "0.9cm" }}
              />
            )}
            <Badge
              variant={admission.status === "admitted" ? "default" : "secondary"}
              className="uppercase tracking-wide text-[10px] px-1.5 py-0"
            >
              ● {admission.status}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Collapse admission" : "Expand admission"}
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "" : "-rotate-90"}`} />
            </Button>
          </div>
        </div>

        {expanded && doc && (
          <Button variant="outline" size="sm" asChild>
            <a href={doc.media_url || `#doc-${doc.id}`} target="_blank" rel="noreferrer">
              <FileText className="h-4 w-4 mr-1" /> View Admission Form
            </a>
          </Button>
        )}

        {expanded && (
        <>
        {/* Care team row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-primary/10">
          <div className="flex items-start gap-2 pt-2">
            <Stethoscope className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Admitting Doctor</p>
              <p className="text-sm font-medium text-foreground truncate">{admittingDoctorName || "—"}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 pt-2">
            <UserCog className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Doctor on Call</p>
              {isHospitalStaff ? (
                <Select
                  value={admission.doctor_on_call_id || ""}
                  onValueChange={(v) => updateAdmission.mutate({ doctor_on_call_id: v })}
                >
                  <SelectTrigger className="h-7 text-xs px-2"><SelectValue placeholder="Assign doctor" /></SelectTrigger>
                  <SelectContent>
                    {hospitalDoctors.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium text-foreground truncate">{onCallDoctorName || "Not assigned"}</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2 pt-2">
            <Clock3 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Nurse on Shift</p>
              <p className="text-sm font-medium text-foreground truncate">{currentShift?.nurse_name_snapshot || "Not assigned"}</p>
              {currentShift && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(currentShift.shift_start), "HH:mm")}
                  {" – "}
                  {currentShift.shift_end ? format(new Date(currentShift.shift_end), "HH:mm") : "now"}
                </p>
              )}
            </div>
          </div>
        </div>

        <NextOfKinBanner contact={contact} />

        <div className="flex items-center gap-1.5 text-xs text-foreground">
          <DoorOpen className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-semibold">Visiting Hours:</span>
          <span>{visitingHours || "Not set — check with the ward"}</span>
        </div>

        {/* Patient's needs note */}
        <div className="rounded-lg border border-primary/20 bg-white p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <NotebookPen className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">Patient's Needs (for visiting family)</span>
          </div>
          {canEdit ? (
            <div className="space-y-1.5">
              <Textarea
                value={needsNote}
                onChange={(e) => setNeedsNote(e.target.value)}
                placeholder="e.g. Please bring my reading glasses and phone charger"
                className="text-xs min-h-[60px]"
              />
              {needsNote !== (admission.patient_care_notes || "") && (
                <Button size="sm" className="h-7 text-xs" onClick={handleSaveNeedsNote} disabled={updateAdmission.isPending}>
                  {updateAdmission.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                </Button>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {admission.patient_care_notes || "No needs recorded yet."}
            </p>
          )}
        </div>
        </>
        )}
      </div>

      {/* === Clinical sections === */}
      {expanded && (
      <div className="p-4">
        <div className="patient-section-frame rounded-xl border border-neutral-400 bg-white overflow-hidden divide-y divide-white">
          <Collapsible defaultOpen className="bg-white overflow-hidden">
            <SectionHeader icon={Activity} label="Vitals" extra={<SectionCountPill count={vitals.length} />} />
            <CollapsibleContent className="p-3">
              {canEdit && <Button size="sm" variant="outline" className="mb-2" onClick={() => setShowVitals(true)}><Plus className="h-4 w-4 mr-1" /> Add Vitals</Button>}
              {vitals.length > 0 && (
                <div className="overflow-x-auto">
                  <div className="min-w-[560px]">
                    <div className="grid grid-cols-[1fr_70px_90px_70px_70px_60px] gap-2 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <span>Recorded</span>
                      <span>HR</span>
                      <span>BP</span>
                      <span>SpO₂</span>
                      <span>Temp</span>
                      <span>BMI</span>
                    </div>
                    <div className="space-y-1">
                      {vitals.map((v: any) => (
                        <div key={v.id} className="rounded bg-muted/40 p-2">
                          <div className="grid grid-cols-[1fr_70px_90px_70px_70px_60px] gap-2 items-center text-xs whitespace-nowrap">
                            <span className="text-muted-foreground truncate">
                              {format(new Date(v.recorded_at), "dd MMM yyyy HH:mm")}
                            </span>
                            <span>{v.heart_rate || "-"} bpm</span>
                            <span>{v.bp_systolic || "-"}/{v.bp_diastolic || "-"}</span>
                            <span>{v.spo2 || "-"}%</span>
                            <span>{v.temperature_c || "-"}°C</span>
                            <span>{v.bmi || "-"}</span>
                          </div>
                          {v.nurse_name_snapshot && (
                            <p className="text-xs text-muted-foreground mt-1">Nurse: {v.nurse_name_snapshot}</p>
                          )}
                          {v.notes && <p className="text-xs text-muted-foreground mt-0.5">{v.notes}</p>}
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
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible defaultOpen={false} className="bg-white overflow-hidden">
            <SectionHeader icon={Pill} label="Active Medications" extra={<SectionCountPill count={meds.length} />} />
            <CollapsibleContent className="p-3">
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
            </CollapsibleContent>
          </Collapsible>

          <Collapsible defaultOpen={false} className="bg-white overflow-hidden">
            <SectionHeader icon={FlaskConical} label="Lab Results" extra={<SectionCountPill count={labs.length} />} />
            <CollapsibleContent className="p-3">
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
            </CollapsibleContent>
          </Collapsible>

          <Collapsible defaultOpen={false} className="bg-white overflow-hidden">
            <SectionHeader icon={Scan} label="Imaging" extra={<SectionCountPill count={imaging.length} />} />
            <CollapsibleContent className="p-3">
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
            </CollapsibleContent>
          </Collapsible>

          {/* Diet & Meals */}
          <Collapsible defaultOpen={false} className="bg-white overflow-hidden">
            <SectionHeader icon={UtensilsCrossed} label="Diet & Meals" extra={<SectionCountPill count={meals.length} />} />
            <CollapsibleContent className="p-3 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground shrink-0">Diet:</span>
                {isHospitalStaff ? (
                  <Select value={admission.diet_type || ""} onValueChange={(v) => updateAdmission.mutate({ diet_type: v })}>
                    <SelectTrigger className="h-7 w-[200px] text-xs"><SelectValue placeholder="Set diet type" /></SelectTrigger>
                    <SelectContent>
                      {DIET_PRESETS.map((d) => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className="text-xs">{admission.diet_type || "Not set"}</Badge>
                )}
              </div>

              {isHospitalStaff && (
                <div className="rounded-lg border border-border/60 p-2.5 space-y-2">
                  <p className="text-xs font-semibold text-foreground">Log a meal</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={mealSlot} onValueChange={(v) => setMealSlot(v as MealSlot)}>
                      <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MEAL_SLOTS.map((s) => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <ToggleGroup type="single" value={mealAte === null ? "" : mealAte ? "ate" : "not"} onValueChange={(v) => setMealAte(v === "ate" ? true : v === "not" ? false : null)} size="sm" variant="outline">
                      <ToggleGroupItem value="ate" className="text-xs px-2 gap-1"><Check className="h-3 w-3" /> Ate</ToggleGroupItem>
                      <ToggleGroupItem value="not" className="text-xs px-2 gap-1"><XIcon className="h-3 w-3" /> Did not eat</ToggleGroupItem>
                    </ToggleGroup>
                    <Input value={mealNotes} onChange={(e) => setMealNotes(e.target.value)} placeholder="Notes (optional)" className="h-8 text-xs flex-1 min-w-[140px]" />
                    <Button size="sm" className="h-8 text-xs" onClick={handleLogMeal} disabled={logMeal.isPending}>
                      {logMeal.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Log"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                {meals.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No meals logged yet.</p>
                ) : (
                  meals.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/40">
                      <Badge variant="outline" className="text-xs capitalize shrink-0">{m.meal_slot}</Badge>
                      <span className="text-muted-foreground shrink-0">{format(new Date(m.meal_date), "dd MMM")}</span>
                      {m.ate === true && <span className="text-green-700 flex items-center gap-0.5 shrink-0"><Check className="h-3 w-3" /> Ate</span>}
                      {m.ate === false && <span className="text-destructive flex items-center gap-0.5 shrink-0"><XIcon className="h-3 w-3" /> Did not eat</span>}
                      {m.notes && <span className="text-muted-foreground truncate">{m.notes}</span>}
                      {m.nurse_name_snapshot && <span className="text-muted-foreground ml-auto shrink-0">· {m.nurse_name_snapshot}</span>}
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Shift Log */}
          <Collapsible defaultOpen={false} className="bg-white overflow-hidden">
            <SectionHeader icon={Clock3} label="Shift Log" extra={<SectionCountPill count={shifts.length} />} />
            <CollapsibleContent className="p-3 space-y-3">
              {isHospitalStaff && (
                <div className="rounded-lg border border-border/60 p-2.5 space-y-2">
                  <p className="text-xs font-semibold text-foreground">Start a new shift (hands off from current nurse)</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={shiftNurseId} onValueChange={setShiftNurseId}>
                      <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Select nurse" /></SelectTrigger>
                      <SelectContent>
                        {staffMembers.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input value={shiftNotes} onChange={(e) => setShiftNotes(e.target.value)} placeholder="Handover notes (optional)" className="h-8 text-xs flex-1 min-w-[140px]" />
                    <Button size="sm" className="h-8 text-xs" onClick={handleStartShift} disabled={!shiftNurseId || startShift.isPending}>
                      {startShift.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Start Shift"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                {shifts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No shifts logged yet.</p>
                ) : (
                  shifts.map((s) => (
                    <div key={s.id} className="p-2 rounded bg-muted/40 text-xs">
                      <p className="font-medium text-foreground">{s.nurse_name_snapshot}</p>
                      <p className="text-muted-foreground">
                        {format(new Date(s.shift_start), "dd MMM HH:mm")}
                        {" – "}
                        {s.shift_end ? format(new Date(s.shift_end), "dd MMM HH:mm") : "ongoing"}
                      </p>
                      {s.handover_notes && <p className="text-muted-foreground mt-0.5">{s.handover_notes}</p>}
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
      )}

      <AddVitalsDialog open={showVitals} onOpenChange={setShowVitals} admissionId={admission.id} hospitalId={admission.hospital_provider_id} defaultHeight={defaultHeight} defaultWeight={defaultWeight} />
      <AddMedicationDialog open={showMeds} onOpenChange={setShowMeds} admissionId={admission.id} hospitalId={admission.hospital_provider_id} />
      <AddLabResultDialog open={showLabs} onOpenChange={setShowLabs} admissionId={admission.id} hospitalId={admission.hospital_provider_id} />
      <AddImagingDialog open={showImaging} onOpenChange={setShowImaging} admissionId={admission.id} hospitalId={admission.hospital_provider_id} />
    </Card>
  );
}

function usePatientContact(patientId: string) {
  return useQuery({
    queryKey: ["patient-contact-quick-ref", patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("patients")
        .select("name, allergies, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship, emergency_contacts" as any)
        .eq("id", patientId)
        .maybeSingle();
      const ecs = (Array.isArray((data as any)?.emergency_contacts) ? (data as any).emergency_contacts : []) as any[];
      const firstEc = ecs[0];
      const contact: PatientContact = {
        patientName: (data as any)?.name || null,
        allergies: (data as any)?.allergies || null,
        nextOfKinName: (data as any)?.next_of_kin_name || null,
        nextOfKinPhone: (data as any)?.next_of_kin_phone || null,
        nextOfKinRelationship: (data as any)?.next_of_kin_relationship || null,
        emergencyContactName: firstEc?.name || null,
        emergencyContactPhone: firstEc?.phone || null,
        emergencyContactRelationship: firstEc?.relationship || null,
      };
      return contact;
    },
  });
}

export function AdmissionsView({ patientId, patientHeight, patientWeight, canEdit = false }: Props) {
  const { data: admissions = [], isLoading } = useHospitalAdmissions(patientId);
  const { data: contact } = usePatientContact(patientId);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState("");

  const filteredAdmissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return admissions;
    return admissions.filter((a) =>
      [
        a.hospital,
        a.diagnosis,
        a.procedure_description,
        (a as any).title,
        format(new Date(a.admission_date), "dd MMM yyyy"),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [admissions, search]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-foreground">Hospital Admissions</h3>
        {canEdit && (
          <Button size="sm" onClick={() => setShowUpload(true)} className="gap-1">
            <Upload className="h-4 w-4" /> Upload Admission Form
          </Button>
        )}
      </div>

      {admissions.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by date, hospital, or reason for admission..."
            className="h-9 pl-8 text-xs"
          />
        </div>
      )}

      {admissions.length === 0 ? (
        <Card className="p-8 text-center">
          <Hospital className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No hospital admissions on record.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Entries are created automatically when a doctor saves a Hospital Admission Form, or you can upload one yourself.
          </p>
        </Card>
      ) : filteredAdmissions.length === 0 ? (
        <p className="text-xs text-muted-foreground px-1 py-6 text-center">No admissions match your search.</p>
      ) : (
        filteredAdmissions.map((a) => (
          <AdmissionDetail
            key={a.id}
            admission={a}
            canEdit={canEdit}
            defaultHeight={patientHeight}
            defaultWeight={patientWeight}
            contact={contact || {
              patientName: null, allergies: null,
              nextOfKinName: null, nextOfKinPhone: null, nextOfKinRelationship: null,
              emergencyContactName: null, emergencyContactPhone: null, emergencyContactRelationship: null,
            }}
          />
        ))
      )}

      <UploadAdmissionDialog open={showUpload} onOpenChange={setShowUpload} patientId={patientId} />
    </div>
  );
}
