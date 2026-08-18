import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { HeartPulse, Plus, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useInpatientVitals } from "../hooks/useInpatientVitals";
import { supabase } from "@/integrations/supabase/client";

/** Vitals chart for a single ward admission — the "clipboard" a nurse checks
 *  and updates for a patient on her ward. Read-only for anyone without write
 *  access; the record button is always shown since visibility already implies
 *  hospital-staff access (RLS enforces the actual write permission). */
export function InpatientVitalsPanel({
  admissionId,
  hospitalId,
  patientName,
}: {
  admissionId: string | null | undefined;
  hospitalId?: string | null;
  patientName?: string | null;
}) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { vitals, loading, recordVitals } = useInpatientVitals(admissionId, { hospitalId, patientName });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    heart_rate: "", bp_systolic: "", bp_diastolic: "", spo2: "", temperature_c: "", respiratory_rate: "", notes: "",
  });
  const [trendSummary, setTrendSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    if (vitals.length === 0 || !admissionId) { setTrendSummary(null); return; }
    let cancelled = false;
    setSummarizing(true);
    (async () => {
      const [{ data: meds }, { data: meals }] = await Promise.all([
        supabase.from("hospital_admission_chart_entries" as any).select("content").eq("admission_id", admissionId).eq("section", "mar").order("created_at", { ascending: false }).limit(10),
        supabase.from("hospital_admission_chart_entries" as any).select("content").eq("admission_id", admissionId).eq("section", "diet-meals").order("created_at", { ascending: false }).limit(10),
      ]);
      if (cancelled) return;
      supabase.functions
        .invoke("summarize-vitals-trend", { body: { readings: vitals.slice(0, 10), medications: meds ?? [], mealEntries: meals ?? [] } })
        .then(({ data }) => { if (!cancelled) setTrendSummary(data?.summary || null); })
        .catch(() => { if (!cancelled) setTrendSummary(null); })
        .finally(() => { if (!cancelled) setSummarizing(false); });
    })();
    return () => { cancelled = true; };
  }, [vitals, admissionId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await recordVitals({
        recorded_by_name: profile?.full_name || user?.email || "Staff",
        heart_rate: form.heart_rate ? Number(form.heart_rate) : null,
        bp_systolic: form.bp_systolic ? Number(form.bp_systolic) : null,
        bp_diastolic: form.bp_diastolic ? Number(form.bp_diastolic) : null,
        spo2: form.spo2 ? Number(form.spo2) : null,
        temperature_c: form.temperature_c ? Number(form.temperature_c) : null,
        respiratory_rate: form.respiratory_rate ? Number(form.respiratory_rate) : null,
        notes: form.notes || null,
      });
      setForm({ heart_rate: "", bp_systolic: "", bp_diastolic: "", spo2: "", temperature_c: "", respiratory_rate: "", notes: "" });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-2 bg-primary px-4 py-2">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold text-white">
          <HeartPulse className="h-3.5 w-3.5" /> Vitals
        </CardTitle>
        {admissionId && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary" className="h-7 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" /> Record vitals
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle className="text-sm">Record Vitals</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Heart Rate (bpm)</Label>
                  <Input type="number" value={form.heart_rate} onChange={(e) => setForm((f) => ({ ...f, heart_rate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">SpO₂ (%)</Label>
                  <Input type="number" value={form.spo2} onChange={(e) => setForm((f) => ({ ...f, spo2: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">BP Systolic</Label>
                  <Input type="number" value={form.bp_systolic} onChange={(e) => setForm((f) => ({ ...f, bp_systolic: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">BP Diastolic</Label>
                  <Input type="number" value={form.bp_diastolic} onChange={(e) => setForm((f) => ({ ...f, bp_diastolic: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Temperature (°C)</Label>
                  <Input type="number" step="0.1" value={form.temperature_c} onChange={(e) => setForm((f) => ({ ...f, temperature_c: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Resp. Rate</Label>
                  <Input type="number" value={form.respiratory_rate} onChange={(e) => setForm((f) => ({ ...f, respiratory_rate: e.target.value }))} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
        ) : vitals.length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground">No vitals recorded yet.</p>
        ) : (
          <div>
            {(summarizing || trendSummary) && (
              <div className="mx-3 mt-3 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">AI Summary</p>
                  {summarizing ? (
                    <p className="text-xs text-muted-foreground">Summarising trend…</p>
                  ) : (
                    <p className="text-xs text-foreground">{trendSummary}</p>
                  )}
                </div>
              </div>
            )}
          <div className="overflow-x-auto">
            <div className="min-w-[520px]">
              <div className="grid grid-cols-[1fr_60px_80px_60px_60px_60px] gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Recorded</span>
                <span>HR</span>
                <span>BP</span>
                <span>SpO₂</span>
                <span>Temp</span>
                <span>RR</span>
              </div>
              <div className="space-y-1 p-2 pt-0">
                {vitals.map((v) => (
                  <div key={v.id} className="rounded-md bg-muted/40 px-3 py-2">
                    <div className="grid grid-cols-[1fr_60px_80px_60px_60px_60px] gap-2 items-center text-xs whitespace-nowrap">
                      <span className="text-muted-foreground truncate">{format(new Date(v.recorded_at), "dd MMM HH:mm")}</span>
                      <span>{v.heart_rate ?? "—"}</span>
                      <span>{v.bp_systolic ?? "—"}/{v.bp_diastolic ?? "—"}</span>
                      <span>{v.spo2 ?? "—"}%</span>
                      <span>{v.temperature_c ?? "—"}°</span>
                      <span>{v.respiratory_rate ?? "—"}</span>
                    </div>
                    {(v.recorded_by_name || v.notes) && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {v.recorded_by_name && <span>{v.recorded_by_name}</span>}
                        {v.notes && <span>{v.recorded_by_name ? " · " : ""}{v.notes}</span>}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
