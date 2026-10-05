import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Row = Record<string, any>;
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—");
const pick = (r: Row, ...k: string[]) => k.map((x) => r?.[x]).find((v) => v != null && v !== "");

const STATUS: Record<string, string> = {
  none: "Not connected",
  pending: "Waiting for approval in Holarc Health",
  approved: "Connected",
  declined: "Request declined",
  expired: "Access expired",
  not_found: "No Holarc Health account found",
  missing_details: "ID number and date of birth needed",
};

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="frame space-y-2 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary-dark">{title}</h3>
        <span className="text-[11px] text-muted-foreground">{count} {count === 1 ? "record" : "records"}</span>
      </div>
      {count === 0 ? <p className="text-xs text-muted-foreground">Nothing recorded.</p> : children}
    </section>
  );
}

export function HolarcHealthRecords({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const { data: link, isLoading } = useQuery({
    queryKey: ["holarc-health", patientId],
    queryFn: async () => {
      const { data } = await supabase.from("holarc_health_links").select("*").eq("patient_id", patientId).maybeSingle();
      return data;
    },
  });

  const sync = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("holarc-health-sync", { body: { patient_id: patientId } });
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["holarc-health", patientId] });
    toast({ title: error ? "Sync failed" : "Holarc Health", description: error ? "Holarc Health could not be reached. Please try again." : data?.message, variant: error ? "destructive" : undefined });
  };

  const p = (link?.payload ?? {}) as Row;
  const conditions: Row[] = p.chronic_conditions ?? [];
  const rx: Row[] = (p.prescriptions ?? []).filter((r: Row) => r.status !== "cancelled");
  const chronicText: string | null = p.chronic_medications ?? null;
  const admissions: Row[] = p.admissions ?? [];
  const status = link?.status ?? "none";

  return (
    <div className="space-y-3">
      <div className="frame flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Holarc Health · {STATUS[status] ?? status}</p>
          <p className="text-[11px] text-muted-foreground">
            {link?.synced_at ? `Last updated ${fmt(link.synced_at)}` : "Records are shared only after approval in the Holarc Health app."}
          </p>
        </div>
        <Button size="sm" onClick={sync} disabled={busy || isLoading}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {status === "none" || status === "not_found" || status === "missing_details" ? "Connect Holarc Health" : status === "pending" ? "Check approval" : "Refresh"}
        </Button>
      </div>

      <Section title="Chronic conditions" count={conditions.length}>
        <ul className="divide-y divide-border">
          {conditions.map((c, i) => (
            <li key={i} className="flex flex-wrap justify-between gap-2 py-2 text-xs">
              <span className="font-medium text-foreground">{pick(c, "condition", "condition_name", "name", "diagnosis") ?? "Condition"}</span>
              <span className="text-muted-foreground">
                {[pick(c, "status"), pick(c, "diagnosed_date", "diagnosis_date", "onset_date") && `Diagnosed ${fmt(pick(c, "diagnosed_date", "diagnosis_date", "onset_date"))}`].filter(Boolean).join(" · ")}
              </span>
              {pick(c, "notes") && <p className="w-full text-[11px] text-muted-foreground">{c.notes}</p>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Chronic medication" count={rx.length + (chronicText && rx.length === 0 ? 1 : 0)}>
        {rx.length > 0 ? (
          <ul className="divide-y divide-border">
            {rx.map((r, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 py-2 text-xs">
                <span className="font-medium text-foreground">{r.medication}{r.dosage ? ` · ${r.dosage}` : ""}</span>
                <span className="text-muted-foreground">{[r.frequency, r.start_date && `Since ${fmt(r.start_date)}`].filter(Boolean).join(" · ")}</span>
                {r.instructions && <p className="w-full text-[11px] text-muted-foreground">{r.instructions}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="whitespace-pre-line text-xs text-foreground">{chronicText}</p>
        )}
      </Section>

      <Section title="Hospital admissions" count={admissions.length}>
        <ul className="divide-y divide-border">
          {admissions.map((a, i) => (
            <li key={i} className="space-y-0.5 py-2 text-xs">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-medium text-foreground">{a.hospital ?? "Hospital"}</span>
                <span className="text-muted-foreground">{fmt(a.admission_date)} – {a.discharge_date ? fmt(a.discharge_date) : "ongoing"}</span>
              </div>
              {a.diagnosis && <p className="text-muted-foreground">Diagnosis: {a.diagnosis}</p>}
              {a.procedure_description && <p className="text-muted-foreground">Procedure: {a.procedure_description}</p>}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
