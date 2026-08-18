import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { useHospitalWards } from "../../../hooks/useHospitalWards";
import { useHospitalInpatients } from "../../../hooks/useHospitalInpatients";
import { useHospitalShifts } from "../../../hooks/useHospitalShifts";
import { WARD_TYPES, wardBarColor, wardTypeLabel } from "../../../lib/hospitalWards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SECTION_FRAME_CLASS, SECTION_ITEM_CLASS, SECTION_TRIGGER_CLASS } from "@/components/ui/section-accordion";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useNurseWard } from "../../../hooks/useNurseWard";
import { BedDouble, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

function WardForm({ hospitalId, onSaved, defaultWardType }: { hospitalId: string; onSaved: () => void; defaultWardType?: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [wardType, setWardType] = useState(defaultWardType ?? "general");
  const [capacity, setCapacity] = useState("20");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("hospital_wards").insert({
      hospital_id: hospitalId,
      name: name.trim(),
      ward_type: wardType,
      bed_capacity: Number(capacity) || 0,
    });
    setSaving(false);
    if (error) { toast({ title: "Could not add ward", description: error.message, variant: "destructive" }); return; }
    setName(""); setCapacity("20"); setWardType(defaultWardType ?? "general"); setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add ward</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add ward</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Ward name / number</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="General Ward A" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Ward type</Label>
              <Select value={wardType} onValueChange={setWardType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WARD_TYPES.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Bed capacity</Label>
              <Input type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !name.trim()}>Save ward</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WardsScreen({ wardType, title = "Wards" }: { wardType?: string; title?: string } = {}) {
  const { providerId } = useProviderAccess();
  const { toast } = useToast();
  const { isNurse } = useUserRole();
  const { assignment: nurseAssignment } = useNurseWard();
  const { wards: allWardsUnscoped, totals: allTotals, reload } = useHospitalWards(providerId);
  const { inpatients } = useHospitalInpatients(providerId);
  const { onShiftNow } = useHospitalShifts(providerId);

  // Nurses only ever see the single ward they're rostered to, not the whole hospital.
  const allWards = isNurse && nurseAssignment?.wardId
    ? allWardsUnscoped.filter((w) => w.id === nurseAssignment.wardId)
    : allWardsUnscoped;

  const wards = wardType ? allWards.filter((w) => w.ward_type === wardType) : allWards;
  const totals = (wardType || isNurse)
    ? wards.reduce((acc, w) => ({ capacity: acc.capacity + (w.bed_capacity || 0), occupied: acc.occupied + w.occupied }), { capacity: 0, occupied: 0 })
    : allTotals;

  const archive = async (id: string) => {
    const { error } = await supabase.from("hospital_wards").update({ is_active: false }).eq("id", id);
    if (error) { toast({ title: "Could not archive ward", description: error.message, variant: "destructive" }); return; }
    reload();
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">
            {totals.occupied} of {totals.capacity} beds occupied across {wards.length} wards
          </p>
        </div>
        {providerId && <WardForm hospitalId={providerId} onSaved={reload} defaultWardType={wardType} />}
      </header>

      <div className={SECTION_FRAME_CLASS}>
        <Accordion type="multiple">
          {wards.map((ward, i) => {
            const patients = inpatients.filter((p) => p.ward_id === ward.id && p.status !== "discharged");
            const staff = onShiftNow.filter((s) => s.ward_id === ward.id);
            const pct = ward.bed_capacity ? Math.min(100, (ward.occupied / ward.bed_capacity) * 100) : 0;
            return (
              <AccordionItem key={ward.id} value={ward.id} className={SECTION_ITEM_CLASS}>
                <AccordionTrigger className={SECTION_TRIGGER_CLASS}>
                  <div className="flex w-full items-center gap-3 pr-3">
                    <BedDouble className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-bold">{ward.name}</span>
                    <span className="text-xs font-semibold uppercase tracking-wider opacity-70">{wardTypeLabel(ward.ward_type)}</span>
                    <span className="ml-auto text-xs font-semibold tabular-nums">{ward.occupied} / {ward.bed_capacity}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-3">
                  <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", wardBarColor(i))} style={{ width: `${pct}%` }} />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="overflow-hidden rounded-xl border border-neutral-400 bg-white">
                      <div className="border-b bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-white">Admitted patients</div>
                      <ul className="space-y-1.5 p-2">
                        {patients.map((p) => (
                          <li key={p.id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
                            <span className="font-semibold">{p.patient_name}</span>
                            <span className="text-muted-foreground">Bed {p.bed_number || "—"}</span>
                          </li>
                        ))}
                        {!patients.length && <li className="px-3 py-4 text-center text-xs text-muted-foreground">No patients in this ward</li>}
                      </ul>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-neutral-400 bg-white">
                      <div className="border-b bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-white">On shift now</div>
                      <ul className="space-y-1.5 p-2">
                        {staff.map((s) => (
                          <li key={s.id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
                            <span className="font-semibold">{s.staff_name}</span>
                            <span className="capitalize text-muted-foreground">{s.staff_role} · {s.shift_type.replace(/_/g, "-")}</span>
                          </li>
                        ))}
                        {!staff.length && <li className="px-3 py-4 text-center text-xs text-muted-foreground">Nobody clocked in</li>}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => archive(ward.id)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Archive ward
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
        {!wards.length && <p className="p-8 text-center text-xs text-muted-foreground">No wards yet. Add your first ward to start tracking occupancy.</p>}
      </div>
    </div>
  );
}
