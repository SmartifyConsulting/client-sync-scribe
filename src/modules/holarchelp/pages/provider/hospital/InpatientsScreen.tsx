import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProviderAccess } from "../../../components/ProviderGate";
import { useHospitalWards } from "../../../hooks/useHospitalWards";
import { useHospitalInpatients, type InpatientRecord } from "../../../hooks/useHospitalInpatients";
import { useHospitalShifts } from "../../../hooks/useHospitalShifts";
import {
  AdmitPatientDialog, AssignDoctorDialog, AssignNurseDialog, LogActivityDialog, TransferPatientDialog,
} from "../../../components/InpatientDialogs";
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

  const discharge = async (row: InpatientRecord) => {
    const { error } = await supabase
      .from("hospital_inpatient_admissions")
      .update({ status: "discharged", discharged_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) { toast({ title: "Could not discharge", description: error.message, variant: "destructive" }); return; }
    reload();
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold">Inpatients</h2>
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

      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Patient</th>
              <th className="px-3 py-2 text-left">Ward / bed</th>
              <th className="px-3 py-2 text-left">Attending doctors</th>
              <th className="px-3 py-2 text-left">Attending nurses</th>
              <th className="px-3 py-2 text-left">Admitted</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((p) => (
              <tr key={p.id} className="align-top hover:bg-muted/40">
                <td className="px-3 py-2">
                  <p className="font-semibold">{p.patient_name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{p.status}{p.reason ? ` · ${p.reason}` : ""}</p>
                </td>
                <td className="px-3 py-2 text-xs">
                  <p className="font-semibold">{wardName(p.ward_id)}</p>
                  <p className="text-muted-foreground">Bed {p.bed_number || "—"}</p>
                </td>
                <td className="px-3 py-2 text-xs">
                  {p.doctors.length ? p.doctors.map((d) => (
                    <p key={d.id} className="flex items-center gap-1">
                      {d.doctor_name}
                      {d.is_primary && <Badge variant="secondary" className="px-1 py-0 text-[10px]">Primary</Badge>}
                    </p>
                  )) : <span className="text-muted-foreground">None</span>}
                </td>
                <td className="px-3 py-2 text-xs">
                  {p.nurses.length ? p.nurses.map((n) => (
                    <p key={n.id}>
                      {n.nurse_name}
                      {n.care_tasks?.length ? <span className="block text-muted-foreground">{n.care_tasks.join(", ")}</span> : null}
                    </p>
                  )) : <span className="text-muted-foreground">None</span>}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(p.admitted_at).toLocaleString()}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setDoctorFor(p)} title="Assign doctor"><Stethoscope className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setNurseFor(p)} title="Assign nurse"><UserPlus className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setTransferFor(p)} title="Transfer ward"><ArrowRightLeft className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setLogFor(p)} title="Log activity"><NotebookPen className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => discharge(p)} title="Discharge"><LogOut className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={6} className="p-8 text-center text-xs text-muted-foreground">No active inpatients.</td></tr>
            )}
          </tbody>
        </table>
      </div>

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
