import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CARE_ROLES, CARE_TASKS, ACTIVITY_ACTIONS, WARD_TYPES } from "../lib/hospitalWards";
import type { WardWithOccupancy } from "../hooks/useHospitalWards";
import type { InpatientRecord } from "../hooks/useHospitalInpatients";
import type { StaffShift } from "../hooks/useHospitalShifts";
import { logPatientActivity } from "../hooks/usePatientActivityLog";

type PatientOption = { id: string; name: string; patient_user_id: string | null };

/** ---------------------------------------------------------------- Admit */
export function AdmitPatientDialog({
  open, onOpenChange, hospitalId, wards, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hospitalId: string;
  wards: WardWithOccupancy[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<PatientOption[]>([]);
  const [patient, setPatient] = useState<PatientOption | null>(null);
  const [wardId, setWardId] = useState("");
  const [bed, setBed] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || search.trim().length < 2) { setOptions([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, name, patient_user_id")
        .ilike("name", `%${search.trim()}%`)
        .limit(8);
      setOptions((data ?? []) as PatientOption[]);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, open]);

  const save = async () => {
    if (!patient || !wardId) return;
    setSaving(true);
    const { error } = await supabase.from("hospital_inpatient_admissions").insert({
      hospital_id: hospitalId,
      ward_id: wardId,
      patient_id: patient.id,
      patient_user_id: patient.patient_user_id,
      patient_name: patient.name,
      bed_number: bed.trim() || null,
      reason: reason.trim() || null,
      source: "walk_in",
      status: "admitted",
    });
    setSaving(false);
    if (error) { toast({ title: "Could not admit patient", description: error.message, variant: "destructive" }); return; }
    setPatient(null); setSearch(""); setBed(""); setReason(""); setWardId("");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Admit patient</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Patient</Label>
            {patient ? (
              <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <span className="font-semibold">{patient.name}</span>
                <Button variant="ghost" size="sm" onClick={() => setPatient(null)}>Change</Button>
              </div>
            ) : (
              <>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient by name" />
                {options.length > 0 && (
                  <ul className="max-h-40 divide-y overflow-auto rounded-lg border">
                    {options.map((o) => (
                      <li key={o.id}>
                        <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => setPatient(o)}>
                          {o.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Ward</Label>
              <Select value={wardId} onValueChange={setWardId}>
                <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                <SelectContent>
                  {wards.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} ({w.occupied}/{w.bed_capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Bed number</Label>
              <Input value={bed} onChange={(e) => setBed(e.target.value)} placeholder="e.g. 12" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Reason for admission</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !patient || !wardId}>Admit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** ------------------------------------------------------------- Transfer */
export function TransferPatientDialog({
  admission, wards, onOpenChange, onSaved,
}: {
  admission: InpatientRecord | null;
  wards: WardWithOccupancy[];
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [wardType, setWardType] = useState("");
  const [wardId, setWardId] = useState("");
  const [bed, setBed] = useState("");
  const [occupiedBeds, setOccupiedBeds] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setWardType(""); setWardId(""); setBed(""); setReason(""); }, [admission?.id]);

  useEffect(() => {
    if (!wardId) { setOccupiedBeds(new Set()); return; }
    let cancelled = false;
    supabase
      .from("hospital_inpatient_admissions")
      .select("bed_number")
      .eq("ward_id", wardId)
      .neq("status", "discharged")
      .then(({ data }) => {
        if (cancelled) return;
        setOccupiedBeds(new Set((data ?? []).map((r: any) => r.bed_number).filter(Boolean)));
      });
    return () => { cancelled = true; };
  }, [wardId]);

  const transferableWards = useMemo(
    () => wards.filter((w) => w.id !== admission?.ward_id),
    [wards, admission?.ward_id],
  );

  const wardTypesAvailable = useMemo(
    () => WARD_TYPES.filter((t) => transferableWards.some((w) => w.ward_type === t.value)),
    [transferableWards],
  );

  const wardsInType = useMemo(
    () => transferableWards.filter((w) => w.ward_type === wardType),
    [transferableWards, wardType],
  );

  const selectedWard = useMemo(() => wardsInType.find((w) => w.id === wardId) ?? null, [wardsInType, wardId]);

  const availableBeds = useMemo(() => {
    if (!selectedWard) return [];
    const beds: string[] = [];
    for (let i = 1; i <= selectedWard.bed_capacity; i++) {
      const label = String(i);
      if (!occupiedBeds.has(label)) beds.push(label);
    }
    return beds;
  }, [selectedWard, occupiedBeds]);

  const save = async () => {
    if (!admission || !wardId) return;
    setSaving(true);
    const { error } = await supabase.rpc("hospital_transfer_patient", {
      _admission_id: admission.id,
      _to_ward_id: wardId,
      _to_bed: bed.trim() || null,
      _reason: reason.trim() || null,
    });
    setSaving(false);
    if (error) { toast({ title: "Transfer failed", description: error.message, variant: "destructive" }); return; }
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={!!admission} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Transfer {admission?.patient_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Ward type</Label>
              <Select value={wardType} onValueChange={(v) => { setWardType(v); setWardId(""); }}>
                <SelectTrigger><SelectValue placeholder="Select ward type" /></SelectTrigger>
                <SelectContent>
                  {wardTypesAvailable.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Move to ward</Label>
              <Select value={wardId} onValueChange={(v) => { setWardId(v); setBed(""); }} disabled={!wardType}>
                <SelectTrigger><SelectValue placeholder={wardType ? "Select ward" : "Choose a type first"} /></SelectTrigger>
                <SelectContent>
                  {wardsInType.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name} ({w.occupied}/{w.bed_capacity})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">New bed number</Label>
            <Select value={bed} onValueChange={setBed} disabled={!wardId}>
              <SelectTrigger><SelectValue placeholder={wardId ? (availableBeds.length ? "Select bed" : "No free beds in this ward") : "Choose a ward first"} /></SelectTrigger>
              <SelectContent>
                {availableBeds.map((b) => (
                  <SelectItem key={b} value={b}>Bed {b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !wardId || (availableBeds.length > 0 && !bed)}>Transfer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** ------------------------------------------------- Attending doctor add */
export function AssignDoctorDialog({
  admission, onOpenChange, onSaved,
}: {
  admission: InpatientRecord | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ id: string; full_name: string | null; specialty: string | null }[]>([]);
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setSearch(""); setResults([]); setIsPrimary(false); }, [admission?.id]);

  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase.rpc("search_doctor_profiles", { _name: search.trim() });
      setResults(((data ?? []) as any[]).slice(0, 8));
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const assign = async (doctor: { id: string; full_name: string | null; specialty: string | null }) => {
    if (!admission) return;
    setSaving(true);
    if (isPrimary) {
      await supabase.from("hospital_attending_doctors")
        .update({ is_primary: false }).eq("admission_id", admission.id);
    }
    const { error } = await supabase.from("hospital_attending_doctors").insert({
      admission_id: admission.id,
      doctor_id: doctor.id,
      doctor_name: doctor.full_name ?? "Doctor",
      specialty: doctor.specialty,
      is_primary: isPrimary,
    });
    setSaving(false);
    if (error) { toast({ title: "Could not assign doctor", description: error.message, variant: "destructive" }); return; }
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={!!admission} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign attending doctor</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search doctor by name or number" />
          <label className="flex items-center gap-2 text-xs font-semibold">
            <Checkbox checked={isPrimary} onCheckedChange={(v) => setIsPrimary(!!v)} />
            Set as primary attending
          </label>
          <ul className="max-h-56 divide-y overflow-auto rounded-lg border">
            {results.map((d) => (
              <li key={d.id}>
                <button type="button" disabled={saving} className="w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => assign(d)}>
                  <span className="font-semibold">{d.full_name}</span>
                  {d.specialty ? <span className="block text-xs text-muted-foreground">{d.specialty}</span> : null}
                </button>
              </li>
            ))}
            {!results.length && <li className="px-3 py-4 text-center text-xs text-muted-foreground">Search for a doctor to assign</li>}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** -------------------------------------------------- Attending nurse add */
export function AssignNurseDialog({
  admission, hospitalId, shifts, onOpenChange, onSaved,
}: {
  admission: InpatientRecord | null;
  hospitalId: string | null;
  shifts: StaffShift[];
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [nurses, setNurses] = useState<{ id: string; full_name: string }[]>([]);
  const [nurseId, setNurseId] = useState("");
  const [careRole, setCareRole] = useState("primary");
  const [tasks, setTasks] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setNurseId(""); setCareRole("primary"); setTasks([]); }, [admission?.id]);

  useEffect(() => {
    if (!hospitalId) return;
    supabase.from("hospital_nurses").select("id, full_name").eq("hospital_id", hospitalId).order("full_name")
      .then(({ data }) => setNurses((data ?? []) as { id: string; full_name: string }[]));
  }, [hospitalId]);

  /** The nurse's currently open shift, so the assignment is tied to it. */
  const shiftForNurse = useMemo(
    () => shifts.find((s) => s.nurse_id === nurseId && !!s.clocked_in_at && !s.clocked_out_at)
      ?? shifts.find((s) => s.nurse_id === nurseId && new Date(s.ends_at) > new Date()),
    [shifts, nurseId],
  );

  const toggleTask = (task: string) =>
    setTasks((prev) => (prev.includes(task) ? prev.filter((t) => t !== task) : [...prev, task]));

  const save = async () => {
    if (!admission || !nurseId) return;
    const nurse = nurses.find((n) => n.id === nurseId);
    setSaving(true);
    const { error } = await supabase.from("hospital_nurse_assignments").insert({
      admission_id: admission.id,
      shift_id: shiftForNurse?.id ?? null,
      nurse_id: nurseId,
      nurse_name: nurse?.full_name ?? "Nurse",
      care_role: careRole,
      care_tasks: tasks,
    });
    setSaving(false);
    if (error) { toast({ title: "Could not assign nurse", description: error.message, variant: "destructive" }); return; }
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={!!admission} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign attending nurse</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Nurse</Label>
              <Select value={nurseId} onValueChange={setNurseId}>
                <SelectTrigger><SelectValue placeholder="Select nurse" /></SelectTrigger>
                <SelectContent>
                  {nurses.map((n) => <SelectItem key={n.id} value={n.id}>{n.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Care role</Label>
              <Select value={careRole} onValueChange={setCareRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CARE_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Care tasks for this shift</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {CARE_TASKS.map((task) => (
                <label key={task} className="flex items-center gap-2 text-xs">
                  <Checkbox checked={tasks.includes(task)} onCheckedChange={() => toggleTask(task)} />
                  {task}
                </label>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {shiftForNurse
              ? `Linked to the ${shiftForNurse.shift_type.replace(/_/g, "-")} shift starting ${new Date(shiftForNurse.starts_at).toLocaleString()}.`
              : "No matching shift found — the assignment will not be tied to a shift."}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !nurseId}>Assign nurse</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** ----------------------------------------------------- Log a touchpoint */
export function LogActivityDialog({
  admission, staffName, staffRole, onOpenChange, onSaved,
}: {
  admission: InpatientRecord | null;
  staffName: string;
  staffRole: string;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [action, setAction] = useState("vitals_check");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setAction("vitals_check"); setDetails(""); }, [admission?.id]);

  const save = async () => {
    if (!admission) return;
    setSaving(true);
    try {
      await logPatientActivity({
        patientId: admission.patient_id,
        patientUserId: admission.patient_user_id,
        admissionId: admission.id,
        hospitalId: admission.hospital_id,
        wardId: admission.ward_id,
        actionType: action,
        details: details.trim(),
        staffName,
        staffRole,
      });
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast({ title: "Could not log activity", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!admission} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Log activity — {admission?.patient_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Action type</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_ACTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Notes / details</Label>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !details.trim()}>Save entry</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
