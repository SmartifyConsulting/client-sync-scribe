import { useEffect, useState, type ReactNode } from "react";
import { Loader2, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SessionPatientOverviewProps {
  patient: any | undefined;
  currentMedications?: { medication: string; dosage: string; frequency: string }[];
  /** Rendered at the top of the frame (used for the DISC descriptor chips). */
  discSlot?: ReactNode;
}

const stripTags = (s: string) =>
  s.replace(/<\/?(med|symptom|condition)>/g, "").replace(/\s+/g, " ").trim();

const firstSentences = (s: string, count = 2) => {
  const parts = (s.match(/[^.!?]+[.!?]+/g) || [s]).map((p) => p.trim()).filter(Boolean);
  return parts.slice(0, count).join(" ");
};

interface OverviewData {
  headline: string;
  conditions: string[];
  medications: string[];
  allergies: string[];
  symptoms: string[];
  visits: string[];
}

/**
 * Patient Overview — a read-only recap of the last 6 months presented as short,
 * labelled key points (conditions, current medications, allergies, symptoms,
 * recent visits) rather than one long paragraph.
 */
export function SessionPatientOverview({ patient, currentMedications = [], discSlot }: SessionPatientOverviewProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OverviewData | null>(null);

  const fallbackData = (visits: string[] = []): OverviewData => {
    const conditions = (patient?.conditions_diagnoses || [])
      .map((c: any) => c?.name || c?.condition)
      .filter(Boolean);
    const meds = currentMedications.length
      ? currentMedications.map((m) => `${m.medication}${m.dosage ? ` ${m.dosage}` : ""}`)
      : (patient?.current_medications || []).map((m: any) => m?.name || m?.medication).filter(Boolean);
    return {
      headline: `${patient?.name || "This patient"} — key points from the last 6 months.`,
      conditions,
      medications: meds,
      allergies: patient?.allergies ? [String(patient.allergies)] : [],
      symptoms: [],
      visits,
    };
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!patient?.id) return;
      setLoading(true);
      setData(null);
      let visitLabels: string[] = [];
      try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const { data: sessions } = await supabase
          .from("sessions")
          .select("started_at, summary, transcript, status")
          .eq("patient_id", patient.id)
          .gte("started_at", sixMonthsAgo.toISOString())
          .order("started_at", { ascending: false })
          .limit(20);

        visitLabels = (sessions || []).slice(0, 3).map((s: any) => {
          const d = s.started_at ? new Date(s.started_at).toLocaleDateString() : "Visit";
          const gist = stripTags(String(s.summary || "")).slice(0, 90);
          return gist ? `${d} — ${gist}` : d;
        });

        const { data: res, error } = await supabase.functions.invoke("summarize-patient-history", {
          body: { patient, sessions: sessions || [] },
        });
        if (error || res?.error) throw error || new Error(res.error);

        const summary = stripTags(String(res?.summary || ""));
        const next: OverviewData = {
          headline: firstSentences(summary) || fallbackData().headline,
          conditions: (res?.conditions || []).map((c: any) => c?.name || c).filter(Boolean),
          medications: (res?.medications || [])
            .filter((m: any) => m?.status !== "inactive")
            .map((m: any) => [m?.name, m?.dosage].filter(Boolean).join(" "))
            .filter(Boolean),
          allergies: (res?.allergies || [])
            .map((a: any) => (typeof a === "string" ? a : a?.name))
            .filter(Boolean),
          symptoms: (res?.symptoms || []).map((s: any) => s?.name || s).filter(Boolean),
          visits: visitLabels,
        };
        const fb = fallbackData(visitLabels);
        if (!next.medications.length) next.medications = fb.medications;
        if (!next.conditions.length) next.conditions = fb.conditions;
        if (!next.allergies.length) next.allergies = fb.allergies;
        if (!cancelled) setData(next);
      } catch (e) {
        console.warn("Patient overview generation failed", e);
        if (!cancelled) setData(fallbackData(visitLabels));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id]);

  const Column = ({
    label,
    items,
    tone = "default",
  }: {
    label: string;
    items: string[];
    tone?: "default" | "danger";
  }) => (
    <div className="min-w-0">
      <p className="text-xs font-bold text-foreground mb-1">{label}</p>
      {items.length ? (
        <ul className="space-y-0.5">
          {items.slice(0, 6).map((item, i) => (
            <li
              key={i}
              className={`text-xs leading-relaxed ${tone === "danger" ? "text-destructive font-medium" : "text-foreground"}`}
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-xs text-muted-foreground">None recorded</span>
      )}
    </div>
  );

  /** "12 Mar 2026 — acute foot pain" → date normal, problem bold. */
  const Visit = ({ value }: { value: string }) => {
    const idx = value.indexOf("—");
    if (idx < 0) return <li className="text-xs text-foreground leading-relaxed">{value}</li>;
    return (
      <li className="text-xs text-foreground leading-relaxed">
        <span className="text-muted-foreground">{value.slice(0, idx).trim()} — </span>
        <span className="font-bold">{value.slice(idx + 1).trim()}</span>
      </li>
    );
  };

  return (
    <div className="flex flex-col rounded-xl border border-primary bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-primary/5">
        <Stethoscope className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-medium text-foreground">Patient Overview</p>
        <span className="text-[10px] text-muted-foreground ml-auto">Last 6 months</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {discSlot && <div className="mb-2 pb-2 border-b border-border">{discSlot}</div>}
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Building overview...
          </div>
        ) : data ? (
          <div className="space-y-2">
            {data.headline && (
              <p className="text-xs leading-relaxed text-foreground">{data.headline}</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Column label="Conditions" items={data.conditions} />
              <Column label="Current meds" items={data.medications} />
              <Column label="Allergies" items={data.allergies} tone="danger" />
              <Column label="Symptoms" items={data.symptoms} />
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-bold text-foreground mb-1">Recent visits</p>
              {data.visits.length ? (
                <ul className="space-y-0.5">
                  {data.visits.map((v, i) => (
                    <Visit key={i} value={v} />
                  ))}
                </ul>
              ) : (
                <span className="text-xs text-muted-foreground">None recorded</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No history available for this patient yet.</p>
        )}
      </div>
    </div>
  );
}

