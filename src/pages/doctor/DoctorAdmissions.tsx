import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2, BedDouble, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ListGroupToolbar } from "@/components/common/ListGroupToolbar";

type Row = {
  id: string;
  patient_id: string;
  doctor_id: string;
  hospital: string | null;
  admission_date: string;
  discharge_date: string | null;
  diagnosis: string | null;
  status: string;
  patient_name?: string;
  doctor_name?: string;
};

type FormState = {
  id?: string;
  patient_id: string;
  hospital: string;
  admission_date: string;
  discharge_date: string;
  diagnosis: string;
  status: string;
};

const emptyForm = (): FormState => ({
  patient_id: "",
  hospital: "",
  admission_date: new Date().toISOString().slice(0, 10),
  discharge_date: "",
  diagnosis: "",
  status: "admitted",
});

export default function DoctorAdmissions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [scope, setScope] = useState<"mine" | "others">("mine");
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: patients = [] } = useQuery({
    queryKey: ["doctor-admissions-patients"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as { id: string; name: string }[];
      const { data } = await supabase.from("patients").select("id, name").eq("user_id", user.id).order("name");
      return (data || []) as { id: string; name: string }[];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["doctor-admissions"],
    queryFn: async (): Promise<Row[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: myPatients } = await supabase
        .from("patients")
        .select("id, name")
        .eq("user_id", user.id);
      const nameById = new Map<string, string>((myPatients || []).map((p: any) => [p.id, p.name]));
      const ids = Array.from(nameById.keys());
      if (ids.length === 0) return [];

      const { data: rows, error } = await supabase
        .from("hospital_admissions")
        .select("*")
        .in("patient_id", ids)
        .order("admission_date", { ascending: false });
      if (error) throw error;

      const doctorIds = Array.from(new Set((rows || []).map((r: any) => r.doctor_id).filter(Boolean)));
      const docNameById = new Map<string, string>();
      if (doctorIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", doctorIds);
        (profs || []).forEach((p: any) => docNameById.set(p.id, p.full_name));
      }

      return (rows || []).map((r: any) => ({
        ...r,
        patient_name: nameById.get(r.patient_id) || "Unknown patient",
        doctor_name: docNameById.get(r.doctor_id) || "—",
      }));
    },
  });

  const { data: currentUserId } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const rows = useMemo(
    () =>
      (data || []).filter((r) =>
        scope === "mine" ? r.doctor_id === currentUserId : r.doctor_id !== currentUserId,
      ),
    [data, scope, currentUserId],
  );

  const items = useMemo(
    () =>
      rows.map((r) => ({
        item: r,
        date: r.admission_date,
        patient: r.patient_name,
        hospital: r.hospital,
        search: [r.patient_name, r.hospital, r.diagnosis, r.doctor_name, r.status].filter(Boolean).join(" "),
      })),
    [rows],
  );

  const save = async () => {
    if (!form) return;
    if (!form.patient_id) {
      toast({ title: "Select a patient", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      patient_id: form.patient_id,
      hospital: form.hospital.trim() || null,
      admission_date: form.admission_date,
      discharge_date: form.discharge_date || null,
      diagnosis: form.diagnosis.trim() || null,
      status: form.status,
    };
    let error;
    if (form.id) {
      ({ error } = await supabase.from("hospital_admissions").update(payload).eq("id", form.id));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      payload.doctor_id = user?.id;
      ({ error } = await supabase.from("hospital_admissions").insert(payload));
    }
    setSaving(false);
    if (error) {
      toast({ title: "Could not save admission", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: form.id ? "Admission updated" : "Admission added" });
    setForm(null);
    qc.invalidateQueries({ queryKey: ["doctor-admissions"] });
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("hospital_admissions").delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) {
      toast({ title: "Could not delete", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Admission deleted" });
    qc.invalidateQueries({ queryKey: ["doctor-admissions"] });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admissions</h1>
        <p className="text-xs text-muted-foreground">Hospital admissions for your patients</p>
      </div>

      <ToggleGroup
        type="single"
        value={scope}
        onValueChange={(v) => v && setScope(v as "mine" | "others")}
        className="rounded-lg border border-border p-0.5"
      >
        <ToggleGroupItem value="mine" className="h-8 px-3 text-xs">
          Admitted by me
        </ToggleGroupItem>
        <ToggleGroupItem value="others" className="h-8 px-3 text-xs">
          Other doctors
        </ToggleGroupItem>
      </ToggleGroup>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <ListGroupToolbar
          storageKey="admissions"
          items={items}
          allowHospital
          searchPlaceholder="Search admissions..."
          emptyLabel="No admissions to show."
          actions={
            <Button onClick={() => setForm(emptyForm())} className="h-9">
              <Plus className="mr-2 h-4 w-4" /> Add Admission
            </Button>
          }
          renderItem={(r: Row) => (
            <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <BedDouble className="h-4 w-4 shrink-0 text-primary" />
              <button
                onClick={() => navigate(`/patients/${r.patient_id}`)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-semibold text-foreground">{r.patient_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[r.hospital, r.diagnosis].filter(Boolean).join(" · ") || "No details"}
                </p>
              </button>
              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-xs text-muted-foreground">
                  {r.admission_date ? format(new Date(r.admission_date), "d MMM yyyy") : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">{r.doctor_name}</p>
              </div>
              <Badge variant={r.discharge_date ? "secondary" : "default"} className="shrink-0 text-[10px]">
                {r.discharge_date ? "Discharged" : r.status || "Admitted"}
              </Badge>
              {r.doctor_id === currentUserId && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      setForm({
                        id: r.id,
                        patient_id: r.patient_id,
                        hospital: r.hospital || "",
                        admission_date: (r.admission_date || "").slice(0, 10),
                        discharge_date: (r.discharge_date || "").slice(0, 10),
                        diagnosis: r.diagnosis || "",
                        status: r.status || "admitted",
                      })
                    }
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(r.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          )}
        />
      )}

      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit Admission" : "Add Admission"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Patient</Label>
                <Select
                  value={form.patient_id}
                  onValueChange={(v) => setForm({ ...form, patient_id: v })}
                  disabled={!!form.id}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Hospital</Label>
                <Input
                  value={form.hospital}
                  onChange={(e) => setForm({ ...form, hospital: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Admission date</Label>
                  <Input
                    type="date"
                    value={form.admission_date}
                    onChange={(e) => setForm({ ...form, admission_date: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Discharge date</Label>
                  <Input
                    type="date"
                    value={form.discharge_date}
                    onChange={(e) => setForm({ ...form, discharge_date: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Diagnosis</Label>
                <Textarea
                  value={form.diagnosis}
                  onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                  className="text-sm"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete admission?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
