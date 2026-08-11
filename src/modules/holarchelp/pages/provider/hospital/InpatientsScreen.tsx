import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProviderAccess } from "../../../components/ProviderGate";
import { useHospitalWards } from "../../../hooks/useHospitalWards";
import { useHospitalInpatients, type InpatientRecord } from "../../../hooks/useHospitalInpatients";
import { useHospitalShifts } from "../../../hooks/useHospitalShifts";
import {
  AdmitPatientDialog, AssignDoctorDialog, AssignNurseDialog, LogActivityDialog, TransferPatientDialog,
} from "../../../components/InpatientDialogs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  SECTION_CONTENT_CLASS, SECTION_FRAME_CLASS, SECTION_ITEM_CLASS,
  SECTION_TRIGGER_ALWAYS_GREEN_CLASS, SectionCountPill,
} from "@/components/ui/section-accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ArrowRightLeft, LogOut, NotebookPen, Plus, Stethoscope, UserPlus } from "lucide-react";

const STATUS_CHIPS = [
  { value: "admitted", label: "Admitted" },
  { value: "discharged", label: "Discharged" },
  { value: "transferred", label: "Transferred" },
] as const;

type PatientGroup = {
  key: string;
  name: string;
  patientId: string | null;
  rows: InpatientRecord[];
  latest: number;
};

export default function InpatientsScreen() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { providerId } = useProviderAccess();
  const { wards } = useHospitalWards(providerId);
  const { inpatients, reload } = useHospitalInpatients(providerId, true);
  const { shifts } = useHospitalShifts(providerId);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("admitted");
  const [admitOpen, setAdmitOpen] = useState(false);
  const [transferFor, setTransferFor] = useState<InpatientRecord | null>(null);
  const [doctorFor, setDoctorFor] = useState<InpatientRecord | null>(null);
  const [nurseFor, setNurseFor] = useState<InpatientRecord | null>(null);
  const [logFor, setLogFor] = useState<InpatientRecord | null>(null);

  const wardName = (id: string | null) => wards.find((w) => w.id === id)?.name ?? "Unassigned";

  const byStatus = useMemo(
    () => inpatients.filter((p) => p.status === statusFilter),
    [inpatients, statusFilter],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter((p) => p.patient_name.toLowerCase().includes(q) || wardName(p.ward_id).toLowerCase().includes(q));
  }, [byStatus, search, wards]);

  /** Group by patient, newest admission first — both inside a group and across groups. */
  const groups = useMemo<PatientGroup[]>(() => {
    const map = new Map<string, PatientGroup>();
    for (const row of filtered) {
      const key = row.patient_id || row.patient_user_id || row.patient_name.toLowerCase();
      const at = new Date(row.admitted_at).getTime();
      const existing = map.get(key);
      if (existing) {
        existing.rows.push(row);
        existing.latest = Math.max(existing.latest, at);
        if (!existing.patientId && row.patient_id) existing.patientId = row.patient_id;
      } else {
        map.set(key, { key, name: row.patient_name, patientId: row.patient_id, rows: [row], latest: at });
      }
    }
    const list = [...map.values()];
    list.forEach((g) => g.rows.sort((a, b) => new Date(b.admitted_at).getTime() - new Date(a.admitted_at).getTime()));
    return list.sort((a, b) => b.latest - a.latest);
  }, [filtered]);

  const discharge = async (row: InpatientRecord) => {
    const { error } = await supabase
      .from("hospital_inpatient_admissions")
      .update({ status: "discharged", discharged_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) { toast({ title: "Could not discharge", description: error.message, variant: "destructive" }); return; }
    reload();
  };

  const recordLink = (p: InpatientRecord) => (p.patient_id ? `/provider/hospital/patient/${p.patient_id}` : null);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admissions</h1>
          <p className="text-xs text-muted-foreground">{filtered.length} {statusFilter}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient or ward" className="h-9 w-52" />
          <Button size="sm" onClick={() => setAdmitOpen(true)} disabled={!providerId || !wards.length}>
            <Plus className="mr-1 h-4 w-4" /> Admit
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => setStatusFilter(chip.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              statusFilter === chip.value
                ? "border-primary bg-primary text-white"
                : "border-border bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            {chip.label} · {inpatients.filter((p) => p.status === chip.value).length}
          </button>
        ))}
      </div>

      {groups.length ? (
        <Accordion type="multiple" defaultValue={groups.slice(0, 1).map((g) => g.key)} className={SECTION_FRAME_CLASS}>
          {groups.map((group) => (
            <AccordionItem key={group.key} value={group.key} className={SECTION_ITEM_CLASS}>
              <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}>
                <div className="flex flex-1 items-center justify-between gap-3 pr-2">
                  <span className="text-base font-bold">{group.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">
                      {wardName(group.rows[0].ward_id)} · {new Date(group.latest).toLocaleDateString()}
                    </span>
                    <SectionCountPill count={group.rows.length} />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className={SECTION_CONTENT_CLASS}>
                <Accordion type="multiple" className="rounded-lg border border-border overflow-hidden">
                  {group.rows.map((p) => {
                    const href = recordLink(p);
                    return (
                      <AccordionItem key={p.id} value={p.id} className="border-b border-border last:border-b-0 bg-card">
                        <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-muted/50">
                          <div className="flex flex-1 flex-wrap items-center justify-between gap-2 pr-2 text-left">
                            <span className="text-sm font-semibold">
                              {wardName(p.ward_id)} · Bed {p.bed_number || "—"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              <span className="capitalize">{p.status}</span> · {new Date(p.admitted_at).toLocaleString()}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 px-3 pb-3 pt-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {href ? (
                              <Link to={href} className="font-semibold text-primary hover:underline">
                                {p.patient_name}
                              </Link>
                            ) : (
                              <span
                                className="font-semibold text-muted-foreground"
                                title="Not linked to a patient profile"
                              >
                                {p.patient_name}
                              </span>
                            )}
                            {p.reason ? <span className="text-muted-foreground">· {p.reason}</span> : null}
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="text-xs">
                              <p className="mb-1 font-bold">Attending doctors</p>
                              {p.doctors.length ? p.doctors.map((d) => (
                                <p key={d.id} className="flex items-center gap-1">
                                  {d.doctor_name}
                                  {d.is_primary && <Badge variant="secondary" className="px-1 py-0 text-[10px]">Primary</Badge>}
                                </p>
                              )) : <span className="text-muted-foreground">None</span>}
                            </div>
                            <div className="text-xs">
                              <p className="mb-1 font-bold">Attending nurses</p>
                              {p.nurses.length ? p.nurses.map((n) => (
                                <p key={n.id}>
                                  {n.nurse_name}
                                  {n.care_tasks?.length ? <span className="block text-muted-foreground">{n.care_tasks.join(", ")}</span> : null}
                                </p>
                              )) : <span className="text-muted-foreground">None</span>}
                            </div>
                          </div>

                          <div className="flex flex-wrap justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setDoctorFor(p)} title="Assign doctor"><Stethoscope className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setNurseFor(p)} title="Assign nurse"><UserPlus className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setTransferFor(p)} title="Transfer ward"><ArrowRightLeft className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setLogFor(p)} title="Log activity"><NotebookPen className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => discharge(p)} title="Discharge"><LogOut className="h-3.5 w-3.5" /></Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="rounded-2xl border bg-card p-8 text-center text-xs text-muted-foreground">
          No {statusFilter} admissions.
        </div>
      )}

      {providerId && (
        <AdmitPatientDialog open={admitOpen} onOpenChange={setAdmitOpen} hospitalId={providerId} wards={wards} onSaved={reload} />
      )}
      <TransferPatientDialog admission={transferFor} wards={wards} onOpenChange={(v) => !v && setTransferFor(null)} onSaved={reload} />
      <AssignDoctorDialog admission={doctorFor} onOpenChange={(v) => !v && setDoctorFor(null)} onSaved={reload} />
      <AssignNurseDialog admission={nurseFor} hospitalId={providerId} shifts={shifts} onOpenChange={(v) => !v && setNurseFor(null)} onSaved={reload} />
      <LogActivityDialog
        admission={logFor}
        staffName={(user?.user_metadata?.full_name as string) || user?.email || "Staff"}
        staffRole="staff"
        onOpenChange={(v) => !v && setLogFor(null)}
        onSaved={reload}
      />
    </div>
  );
}
