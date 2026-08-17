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

/**
 * Condense a session summary into a short "what was presented" clause:
 * drops the patient's name and leading pronoun/verb phrasing, and never cuts mid-word.
 */
const summariseVisit = (summary: string, patientName?: string | null) => {
  let text = (summary || "").trim();
  if (!text) return "";
  // First sentence only.
  text = (text.match(/[^.!?]+[.!?]?/) || [text])[0].trim();
  if (patientName) {
    const names = patientName.split(/\s+/).filter((n) => n.length > 2).map((n) => n.replace(/[^\w]/g, ""));
    for (const n of names) text = text.replace(new RegExp(`\\b${n}\\b`, "gi"), "").trim();
  }
  text = text
    .replace(/^(the\s+)?(patient|pt|he|she|they|mr\.?|mrs\.?|ms\.?|dr\.?)\b/i, "")
    .replace(/^[\s,'’]*s\b/i, "")
    .replace(/^\s*(who\s+)?(presented|presents|complained|complains|reported|reports|attended|came in|was seen|is|was|has|had)\s*(with|of|for|to)?\s*/i, "")
    .replace(/^[\s,;:.-]+/, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[.\s]+$/, "")
    .trim();
  if (!text) return "";
  if (text.length > 80) {
    const cut = text.slice(0, 80);
    const boundary = Math.max(cut.lastIndexOf(","), cut.lastIndexOf(" "));
    text = `${cut.slice(0, boundary > 40 ? boundary : 80).replace(/[,\s]+$/, "")}…`;
  }
  return text.charAt(0).toLowerCase() + text.slice(1);
};

interface DatedItem {
  text: string;
  date?: string;
}

interface OverviewData {
  headline: string;
  conditions: DatedItem[];
  medications: DatedItem[];
  allergies: string[];
  symptoms: string[];
  visits: string[];
}

/** "Nov 2024" / "2024-11-03" → "2024"; falls back to the raw string if no year is found. */
const extractYear = (dateStr?: string) => {
  if (!dateStr) return undefined;
  const match = String(dateStr).match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : dateStr;
};

/**
 * Patient Overview — a read-only recap of the last 6 months presented as short,
 * labelled key points (conditions, current medications, allergies, symptoms,
 * recent visits) rather than one long paragraph.
 */
export function SessionPatientOverview({ patient, currentMedications = [], discSlot }: SessionPatientOverviewProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OverviewData | null>(null);

  const fallbackData = (visits: string[] = []): OverviewData => {
    const conditions: DatedItem[] = (patient?.conditions_diagnoses || [])
      .map((c: any) => ({ text: c?.name || c?.condition, date: c?.date || c?.diagnosed_date }))
      .filter((c: DatedItem) => c.text);
    const meds: DatedItem[] = currentMedications.length
      ? currentMedications.map((m) => ({ text: `${m.medication}${m.dosage ? ` ${m.dosage}` : ""}` }))
      : (patient?.current_medications || [])
          .map((m: any) => ({ text: m?.name || m?.medication, date: m?.date || m?.start_date }))
          .filter((m: DatedItem) => m.text);
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
          .neq("status", "paused")
          .order("started_at", { ascending: false })
          .limit(20);

        visitLabels = (sessions || []).slice(0, 3).map((s: any) => {
          const d = s.started_at ? new Date(s.started_at).toLocaleDateString() : "Visit";
          const gist = summariseVisit(stripTags(String(s.summary || "")), patient?.name);
          return gist ? `${d} — ${gist}` : d;
        });

        const { data: res, error } = await supabase.functions.invoke("summarize-patient-history", {
          body: { patient, sessions: sessions || [] },
        });
        if (error || res?.error) throw error || new Error(res.error);

        const summary = stripTags(String(res?.summary || ""));
        const next: OverviewData = {
          headline: firstSentences(summary) || fallbackData().headline,
          conditions: (res?.conditions || [])
            .map((c: any) => ({ text: c?.name || (typeof c === "string" ? c : ""), date: c?.date }))
            .filter((c: DatedItem) => c.text),
          medications: (res?.medications || [])
            .filter((m: any) => m?.status !== "inactive")
            .map((m: any) => ({ text: [m?.name, m?.dosage].filter(Boolean).join(" "), date: m?.date }))
            .filter((m: DatedItem) => m.text),
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
    items: (string | DatedItem)[];
    tone?: "default" | "danger";
  }) => (
    <div className="min-w-0">
      <p className="text-xs font-bold text-foreground mb-1">{label}</p>
      {items.length ? (
        <ul className="space-y-0.5">
          {items.slice(0, 6).map((item, i) => {
            const text = typeof item === "string" ? item : item.text;
            const year = typeof item === "string" ? undefined : extractYear(item.date);
            return (
              <li
                key={i}
                className={`text-xs leading-relaxed ${tone === "danger" ? "text-destructive font-medium" : "text-foreground"}`}
              >
                {text}
                {year && <span className="text-muted-foreground"> ({year})</span>}
              </li>
            );
          })}
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Column label="Conditions" items={data.conditions} />
              <Column label="Current meds" items={data.medications} />
              <Column label="Allergies" items={data.allergies} tone="danger" />
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

