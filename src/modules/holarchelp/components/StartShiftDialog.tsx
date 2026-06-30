import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, PlayCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { useParamedicShift } from "../hooks/useParamedicShift";
import { useTranslation } from "react-i18next";
import { toastError } from "@/lib/userMessage";

type Ambulance = { id: string; vehicle_code: string; registration_number: string | null; status: string };
type Member = { id: string; user_id: string | null; invited_name: string | null; invited_email: string | null; role: string };

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
  const { startShift } = useParamedicShift();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<Ambulance[]>([]);
  const [selected, setSelected] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [partnerIds, setPartnerIds] = useState<string[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !providerId) return;
    setLoading(true);
    setSelected("");
    setPartnerIds([]);

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
    ]).then(([{ data: amb, error: e1 }, { data: mem, error: e2 }]) => {
      if (e1) toast.error(e1.message);
      if (e2) toast.error(e2.message);
      const rows = ((amb as any) ?? []) as Ambulance[];
      setList(rows);
      if (rows.length === 1) setSelected(rows[0].id);
      setMembers(((mem as any) ?? []) as Member[]);
      setLoading(false);
    });
  }, [open, providerId]);

  const availablePartners = members.filter((m) => m.user_id && m.user_id !== meId);

  const togglePartner = (uid: string) =>
    setPartnerIds((cur) => (cur.includes(uid) ? cur.filter((x) => x !== uid) : [...cur, uid]));

  const start = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await startShift(selected);
      // After shift created, attach partners
      if (partnerIds.length) {
        const { data: me } = await supabase.auth.getUser();
        const { data: shiftRow } = await supabase
          .from("paramedic_shifts" as any)
          .select("id")
          .eq("user_id", me.user?.id)
          .is("ended_at", null)
          .maybeSingle();
        if ((shiftRow as any)?.id) {
          const rows = partnerIds.map((uid) => ({
            shift_id: (shiftRow as any).id,
            user_id: uid,
            role: "partner",
          }));
          const { error } = await supabase.from("paramedic_shift_partners" as any).insert(rows);
          if (error) toast.error(`Crew partners: ${error.message}`);
        }
      }
      toast.success(t("shift.started"));
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? t("shift.couldNotStart"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-primary" /> {t("shift.startTitle")}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : list.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            {t("shift.noAvailable")}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("shift.pickAmbulance")}</Label>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger><SelectValue placeholder={t("shift.selectVehicle")} /></SelectTrigger>
                <SelectContent>
                  {list.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.vehicle_code}{a.registration_number ? ` · ${a.registration_number}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("shift.availableMessage")}</p>
            </div>

            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> Crew partners (optional)
              </Label>
              <p className="text-[11px] text-muted-foreground -mt-1">
                You are the lead. Tick anyone riding with you on this shift.
              </p>
              {availablePartners.length === 0 ? (
                <p className="text-xs italic text-muted-foreground py-1">No other active crew members.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pt-1">
                  {availablePartners.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer rounded px-1 py-1 hover:bg-background">
                      <Checkbox
                        checked={partnerIds.includes(m.user_id!)}
                        onCheckedChange={() => togglePartner(m.user_id!)}
                      />
                      <span className="truncate">
                        {m.invited_name || m.invited_email || m.user_id?.slice(0, 8)}
                        <span className="ml-1 text-[10px] uppercase text-muted-foreground">· {m.role}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={start} disabled={!selected || busy || list.length === 0}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("shift.startTitle")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
