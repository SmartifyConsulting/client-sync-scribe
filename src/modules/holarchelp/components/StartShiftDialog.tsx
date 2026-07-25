import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, PlayCircle, Truck, Users } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { toastError } from "@/lib/userMessage";
import { useParamedicShift } from "../hooks/useParamedicShift";

type Ambulance = { id: string; vehicle_code: string; registration_number: string | null; status: string };
type Member = {
  id: string;
  user_id: string | null;
  invited_name: string | null;
  invited_email: string | null;
  role: string;
};
type Assignment = { ambulance_id: string; member_id: string; is_default_lead: boolean };

type Selection = {
  ambulance_id: string;
  lead_user_id: string | null;
  partner_user_ids: string[];
};

export function StartShiftDialog({
  providerId,
  open,
  onOpenChange,
}: {
  providerId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { refresh } = useParamedicShift();
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Ambulance[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [meId, setMeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !providerId) return;
    setLoading(true);
    setSelections({});
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));

    Promise.all([
      supabase
        .from("ambulances" as any)
        .select("id, vehicle_code, registration_number, status")
        .eq("provider_id", providerId)
        .eq("status", "available")
        .order("vehicle_code"),
      supabase
        .from("holarchelp_ambulance_members" as any)
        .select("id, user_id, invited_name, invited_email, role")
        .eq("provider_id", providerId)
        .eq("status", "active")
        .not("user_id", "is", null),
      supabase
        .from("ambulance_crew_assignments" as any)
        .select("ambulance_id, member_id, is_default_lead"),
    ]).then(([{ data: amb, error: e1 }, { data: mem, error: e2 }, { data: asg, error: e3 }]) => {
      if (e1) toastError(e1, "Could not load vehicles");
      if (e2) toastError(e2, "Could not load crew");
      if (e3) toastError(e3, "Could not load assignments");
      setVehicles((amb as any) ?? []);
      setMembers((mem as any) ?? []);
      setAssignments((asg as any) ?? []);
      setLoading(false);
    });
  }, [open, providerId]);

  // Lookup helpers
  const memberByUserId = useMemo(() => {
    const m = new Map<string, Member>();
    members.forEach((x) => { if (x.user_id) m.set(x.user_id, x); });
    return m;
  }, [members]);

  const assignmentsByVehicle = useMemo(() => {
    const m = new Map<string, Assignment[]>();
    assignments.forEach((a) => {
      const list = m.get(a.ambulance_id) ?? [];
      list.push(a);
      m.set(a.ambulance_id, list);
    });
    return m;
  }, [assignments]);

  const memberById = useMemo(() => {
    const m = new Map<string, Member>();
    members.forEach((x) => m.set(x.id, x));
    return m;
  }, [members]);

  const labelFor = (m: Member) =>
    m.invited_name || m.invited_email || (m.user_id ? m.user_id.slice(0, 8) : "Member");

  // Map: user_id -> ambulance label they are already on (in this dialog)
  const userToVehicleLabel = useMemo(() => {
    const m = new Map<string, string>();
    Object.values(selections).forEach((sel) => {
      const v = vehicles.find((x) => x.id === sel.ambulance_id);
      const label = v?.vehicle_code ?? "vehicle";
      if (sel.lead_user_id) m.set(sel.lead_user_id, label);
      sel.partner_user_ids.forEach((uid) => m.set(uid, label));
    });
    return m;
  }, [selections, vehicles]);

  const toggleVehicle = (v: Ambulance, checked: boolean) => {
    setSelections((cur) => {
      const next = { ...cur };
      if (!checked) {
        delete next[v.id];
        return next;
      }
      // Pre-fill from assignments
      const asg = assignmentsByVehicle.get(v.id) ?? [];
      const assignedMembers = asg
        .map((a) => memberById.get(a.member_id))
        .filter((x): x is Member => !!x && !!x.user_id);
      const leadFromAssignment = asg.find((a) => a.is_default_lead);
      const leadMember =
        (leadFromAssignment && memberById.get(leadFromAssignment.member_id)) ||
        (meId ? memberByUserId.get(meId) : null) ||
        assignedMembers[0] ||
        null;
      const partners = assignedMembers
        .filter((m) => m.user_id && m.user_id !== leadMember?.user_id)
        .map((m) => m.user_id as string)
        // skip anyone already on another selected vehicle
        .filter((uid) => !userToVehicleLabel.has(uid));
      next[v.id] = {
        ambulance_id: v.id,
        lead_user_id: leadMember?.user_id ?? meId ?? null,
        partner_user_ids: partners,
      };
      return next;
    });
  };

  const setLead = (vehicleId: string, userId: string) => {
    setSelections((cur) => ({
      ...cur,
      [vehicleId]: { ...cur[vehicleId], lead_user_id: userId, partner_user_ids: cur[vehicleId].partner_user_ids.filter((u) => u !== userId) },
    }));
  };

  const togglePartner = (vehicleId: string, userId: string) => {
    setSelections((cur) => {
      const sel = cur[vehicleId];
      const exists = sel.partner_user_ids.includes(userId);
      return {
        ...cur,
        [vehicleId]: {
          ...sel,
          partner_user_ids: exists
            ? sel.partner_user_ids.filter((u) => u !== userId)
            : [...sel.partner_user_ids, userId],
        },
      };
    });
  };

  const selectedCount = Object.keys(selections).length;
  const totalCrew = Object.values(selections).reduce(
    (s, x) => s + (x.lead_user_id ? 1 : 0) + x.partner_user_ids.length,
    0,
  );

  const start = async () => {
    if (selectedCount === 0) return;
    setBusy(true);
    try {
      const payload = { selections: Object.values(selections) };
      const { error } = await supabase.rpc("holarchelp_start_shifts_bulk" as any, { _payload: payload });
      if (error) throw error;
      toast.success(`Started ${selectedCount} shift${selectedCount === 1 ? "" : "s"} Â· ${totalCrew} crew on duty`);
      await refresh();
      onOpenChange(false);
    } catch (e: any) {
      toastError(e, "Could not start shifts");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-primary" /> Start shift
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : vehicles.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            No ambulances are currently available.
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select the ambulances going on shift now. Each vehicle gets its own lead and crew.
            </p>

            {vehicles.map((v) => {
              const sel = selections[v.id];
              const checked = !!sel;
              const asg = assignmentsByVehicle.get(v.id) ?? [];
              const assignedMembers = asg
                .map((a) => memberById.get(a.member_id))
                .filter((x): x is Member => !!x && !!x.user_id);
              // Lead options: assigned members + me; fall back to all active crew if none
              const leadPool = (assignedMembers.length ? assignedMembers : members.filter((m) => m.user_id));
              // Crew checklist = assigned + any other active members
              const crewPool = members.filter((m) => m.user_id);

              return (
                <div
                  key={v.id}
                  className={`rounded-xl border p-3 ${checked ? "border-primary/50 bg-primary/5" : "border-border bg-card"}`}
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={checked} onCheckedChange={(c) => toggleVehicle(v, !!c)} />
                    <Truck className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">
                      {v.vehicle_code}
                      {v.registration_number ? <span className="text-muted-foreground"> Â· {v.registration_number}</span> : null}
                    </span>
                  </label>

                  {checked && sel && (
                    <div className="mt-3 space-y-3 pl-6">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Lead paramedic</Label>
                        <Select
                          value={sel.lead_user_id ?? ""}
                          onValueChange={(val) => setLead(v.id, val)}
                        >
                          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select lead" /></SelectTrigger>
                          <SelectContent>
                            {leadPool.map((m) => (
                              <SelectItem key={m.id} value={m.user_id!}>
                                {labelFor(m)} <span className="text-muted-foreground">Â· {m.role}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" /> Crew partners
                        </Label>
                        <div className="max-h-40 overflow-y-auto rounded-lg border bg-background p-1.5 space-y-1">
                          {crewPool
                            .filter((m) => m.user_id !== sel.lead_user_id)
                            .map((m) => {
                              const uid = m.user_id!;
                              const onOther = userToVehicleLabel.get(uid);
                              const onThis = sel.partner_user_ids.includes(uid);
                              const disabled = !!onOther && onOther !== (vehicles.find((x) => x.id === v.id)?.vehicle_code);
                              return (
                                <label
                                  key={m.id}
                                  className={`flex items-center gap-2 text-sm rounded px-1.5 py-1 ${
                                    disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50 cursor-pointer"
                                  }`}
                                >
                                  <Checkbox
                                    checked={onThis}
                                    disabled={disabled}
                                    onCheckedChange={() => !disabled && togglePartner(v.id, uid)}
                                  />
                                  <span className="truncate">
                                    {labelFor(m)}
                                    <span className="ml-1 text-sm uppercase text-muted-foreground">Â· {m.role}</span>
                                    {disabled && (
                                      <span className="ml-1 text-sm text-muted-foreground italic">
                                        (already on {onOther})
                                      </span>
                                    )}
                                  </span>
                                </label>
                              );
                            })}
                          {crewPool.filter((m) => m.user_id !== sel.lead_user_id).length === 0 && (
                            <p className="text-sm italic text-muted-foreground px-1 py-1">No other crew members.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={start} disabled={selectedCount === 0 || busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start {selectedCount > 0 ? `${selectedCount} shift${selectedCount === 1 ? "" : "s"}` : "shift"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

