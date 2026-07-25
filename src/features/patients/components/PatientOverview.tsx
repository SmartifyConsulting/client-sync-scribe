import { useState, useEffect } from "react";
import { Loader2, Sparkles, Pill, HeartPulse, RefreshCw, Activity, AlertTriangle, Check, X, ChevronDown, ChevronRight, Flame, PartyPopper, Droplets, ShieldAlert, Phone, Mail } from "lucide-react";
import { DiscPersonalityCard } from "@/features/patients/components/DiscPersonalityCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Session } from "@/hooks/useSessions";
import { medicationSyncBus } from "@/lib/utils";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

interface PatientOverviewProps {
  patient: {
    id: string;
    name: string;
    dob?: string | null;
    status: string;
    created_at: string;
    medical_aid?: string | null;
    general_practitioner?: string | null;
    occupation?: string | null;
    notes?: string | null;
    allergies?: string | null;
    is_chronic?: boolean | null;
    blood_type?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    emergency_contact_email?: string | null;
    emergency_contact_relationship?: string | null;
    emergency_contacts?: Array<{ name?: string; phone?: string; email?: string; relationship?: string }> | null;
  };
  sessions: Session[];
  isSelfService?: boolean;
}


interface StatusItem {
  name: string;
  date: string;
  status: "active" | "inactive";
  end_date?: string;
}

interface MedicationItem extends StatusItem {}
interface SymptomItem extends StatusItem {}
interface ConditionItem extends StatusItem {}

interface AllergyItem {
  name: string;
  severity: "mild" | "moderate" | "severe";
}

interface MedicationConflict {
  medication1: string;
  medication2?: string;
  reason: string;
  severity: "low" | "moderate" | "high";
}

interface SummaryData {
  summary: string;
  medications: MedicationItem[];
  symptoms: SymptomItem[];
  conditions: ConditionItem[];
  allergies: AllergyItem[];
  conflicts: MedicationConflict[];
}

function ChronicAdherenceSection({ patientId, patientName }: { patientId: string; patientName: string }) {
  const { toast } = useToast();
  const [adherenceData, setAdherenceData] = useState<{ prescription: string; streak: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [congratulating, setCongratulating] = useState(false);

  const fetchAdherence = async () => {
    setLoading(true);
    try {
      const { data: prescriptions } = await supabase
        .from("prescriptions")
        .select("id, medication")
        .eq("patient_id", patientId)
        .eq("status", "active");
      if (!prescriptions || prescriptions.length === 0) { setAdherenceData([]); setLoading(false); return; }

      const { data: adherence } = await supabase
        .from("medication_adherence")
        .select("prescription_id, scheduled_date, status")
        .eq("patient_id", patientId)
        .eq("status", "completed")
        .order("scheduled_date", { ascending: false });

      const streaks = prescriptions.map((rx) => {
        const records = (adherence || [])
          .filter((a) => a.prescription_id === rx.id)
          .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));
        let streak = 0;
        const today = new Date();
        let checkDate = today;
        for (let i = 0; i < 365; i++) {
          const dateStr = checkDate.toISOString().split("T")[0];
          if (records.some((r) => r.scheduled_date === dateStr)) {
            streak++;
            checkDate = new Date(checkDate.getTime() - 86400000);
          } else break;
        }
        return { prescription: rx.medication, streak };
      });
      setAdherenceData(streaks);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAdherence();
  }, [patientId]);

  // Refresh when medications are updated anywhere in the app
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { patientId?: string } | undefined;
      if (!detail?.patientId || detail.patientId === patientId) fetchAdherence();
    };
    medicationSyncBus.addEventListener("medications-updated", handler);
    return () => medicationSyncBus.removeEventListener("medications-updated", handler);
  }, [patientId]);

  const maxStreak = Math.max(0, ...adherenceData.map((d) => d.streak));

  const handleCongratulate = async () => {
    setCongratulating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert congratulation record
      await supabase.from("doctor_congratulations").insert({
        doctor_id: user.id,
        patient_id: patientId,
        streak_type: "medication_adherence",
        streak_count: maxStreak,
      });

      // Award 250 Vulas to patient
      await supabase.from("patient_rewards").insert({
        patient_id: patientId,
        awarded_by: user.id,
        lollipops_count: 250,
        visit_category: "Acknowledgement of Achievement",
        reward_type: "congratulation",
      });

      // Notify patient
      const { data: patientData } = await supabase
        .from("patients")
        .select("patient_user_id")
        .eq("id", patientId)
        .maybeSingle();
      if (patientData?.patient_user_id) {
        await supabase.from("notifications").insert({
          user_id: patientData.patient_user_id,
          title: "🎉 Your Doctor Congratulated You!",
          description: `Your doctor congratulated you on your ${maxStreak}-day medication streak! You earned 250 Vulas!`,
          type: "congratulation",
          reference_id: patientId,
        });
      }

      toast({
        title: "🎉 Congratulations Sent!",
        description: `${patientName} received 250 Vulas for their ${maxStreak}-day streak. You also earned 250 Vulas!`,
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setCongratulating(false);
  };

  return (
    <div className="rounded-xl border border-terracotta/30 bg-terracotta/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-terracotta" />
          <span className="font-semibold text-foreground">Chronic Medication Patient</span>
          <Badge className="bg-terracotta/10 text-terracotta border-terracotta/30">Chronic</Badge>
        </div>
        {maxStreak >= 7 && (
          <Button
            onClick={handleCongratulate}
            disabled={congratulating}
            size="sm"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {congratulating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PartyPopper className="h-4 w-4" />
            )}
            Congratulate (+250 Ⓜ each)
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        This patient is on chronic medication and can earn adherence rewards for daily medication logging.
      </p>
      {!loading && adherenceData.length > 0 && (
        <div className="flex flex-wrap gap-3 pt-1">
          {adherenceData.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
              <Flame className={`h-4 w-4 ${d.streak >= 7 ? "text-orange-500" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">{d.prescription}</span>
              <span className="text-sm font-bold text-foreground">{d.streak}d</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PatientOverview({ patient, sessions, isSelfService = false }: PatientOverviewProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-patient-history", {
        body: { patient, sessions },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Lookup table of patient.current_medications keyed by lowercased name
      const medMeta: Record<string, { end_date?: string; status?: string }> = {};
      const pmedSrc: any[] = Array.isArray((patient as any).current_medications)
        ? (patient as any).current_medications
        : [];
      for (const pm of pmedSrc) {
        if (pm?.name) medMeta[String(pm.name).toLowerCase()] = { end_date: pm.end_date, status: pm.status };
      }

      const processedData: SummaryData = {
        summary: data.summary || "",
        medications: (data.medications || []).map((m: any) => {
          const meta = medMeta[String(m.name || "").toLowerCase()] || {};
          const status = m.status || (meta.status === "past" ? "inactive" : "active");
          return {
            ...m,
            status,
            end_date: m.end_date || meta.end_date,
          };
        }),
        symptoms: (data.symptoms || data.conditions || []).map((s: any) => ({
          ...s,
          status: s.status || "active",
        })),
        conditions: (data.conditions || []).map((c: any) => ({
          ...c,
          status: c.status || "active",
        })),
        allergies: data.allergies || [],
        conflicts: data.conflicts || [],
      };

      setSummaryData(processedData);
    } catch (error: any) {
      console.error("Error generating summary:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate patient summary",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patient && !summaryData) {
      generateSummary();
    }
  }, [patient.id]);

  const toggleStatus = (
    type: "medications" | "symptoms" | "conditions",
    index: number
  ) => {
    if (!summaryData) return;

    setSummaryData((prev) => {
      if (!prev) return prev;
      const updated = { ...prev };
      const item = updated[type][index];
      updated[type] = [
        ...updated[type].slice(0, index),
        { ...item, status: item.status === "active" ? "inactive" : "active" },
        ...updated[type].slice(index + 1),
      ];
      return updated;
    });

    toast({
      title: "Status Updated",
      description: `Item marked as ${summaryData[type][index].status === "active" ? "inactive" : "active"}`,
    });
  };

  const YEAR_COLORS = [
    "text-primary border-primary",
    "text-blue-600 border-blue-500",
    "text-amber-600 border-amber-500",
    "text-emerald-600 border-emerald-500",
    "text-violet-600 border-violet-500",
    "text-rose-600 border-rose-500",
  ];

  const YEAR_DOT_COLORS = [
    "bg-primary",
    "bg-blue-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-rose-500",
  ];

  // Render summary as timeline bullets with dates, grouped by year
  const renderSummaryTimeline = (text: string) => {
    const cleanText = text.replace(/<\/?(?:med|symptom|condition)>/g, '');
    const sentences = cleanText.split(/(?<=[.!?])\s+|(?:^|\n)\s*[-•]\s*/).filter(s => s.trim().length > 0);
    
    if (sentences.length <= 1) {
      return <div className="text-foreground leading-relaxed">{renderInlineHighlights(text)}</div>;
    }

    const datePattern = /^(\d{1,2}\s+\w+\s+\d{4}|\w+\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2}|\w+\s+\d{4})\s*[-–:]\s*/;
    
    interface TimelineItem {
      date: string | null;
      lines: string[];
      year: number | null;
    }
    
    const timelineItems: TimelineItem[] = [];
    const currentYear = new Date().getFullYear();
    
    sentences.forEach((sentence) => {
      const match = sentence.match(datePattern);
      if (match) {
        const dateStr = match[1];
        // Try to extract year from date string
        const yearMatch = dateStr.match(/(\d{4})/);
        const year = yearMatch ? parseInt(yearMatch[1]) : null;
        timelineItems.push({ date: dateStr, lines: [sentence.replace(datePattern, '').trim()], year });
      } else if (timelineItems.length > 0) {
        timelineItems[timelineItems.length - 1].lines.push(sentence.trim());
      } else {
        timelineItems.push({ date: null, lines: [sentence.trim()], year: null });
      }
    });

    // Group by year
    const yearGroups: Record<string, TimelineItem[]> = {};
    timelineItems.forEach((item) => {
      const yearKey = item.year ? String(item.year) : String(currentYear);
      if (!yearGroups[yearKey]) yearGroups[yearKey] = [];
      yearGroups[yearKey].push(item);
    });

    const sortedYears = Object.keys(yearGroups).sort((a, b) => parseInt(b) - parseInt(a));

    return (
      <div className="space-y-4">
        {sortedYears.map((yearStr, yearIndex) => {
          const year = parseInt(yearStr);
          const isCurrentYear = year === currentYear;
          const colorClass = YEAR_COLORS[yearIndex % YEAR_COLORS.length];
          const dotColor = YEAR_DOT_COLORS[yearIndex % YEAR_DOT_COLORS.length];
          const items = yearGroups[yearStr];

          return (
            <Collapsible key={yearStr} defaultOpen={isCurrentYear}>
              <CollapsibleTrigger className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors font-semibold text-sm ${colorClass}`}>
                <ChevronDown className="h-4 w-4 transition-transform data-[state=closed]:rotate-[-90deg]" />
                <span className={`w-3 h-3 rounded-full ${dotColor}`} />
                {yearStr}
                <Badge variant="secondary" className="ml-auto text-xs">{items.length} event{items.length !== 1 ? 's' : ''}</Badge>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-3 ml-4 mt-2 pl-4 border-l-2" style={{ borderColor: `var(--${yearIndex === 0 ? 'primary' : 'border'})` }}>
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full ${dotColor} mt-1.5 shrink-0`} />
                        {i < items.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                      </div>
                      <div className="pb-2">
                        {item.date && (
                          <p className={`text-xs font-bold mb-0.5 ${colorClass.split(' ')[0]}`}>{item.date}</p>
                        )}
                        {item.lines.map((line, j) => (
                          <p key={j} className="text-sm text-foreground leading-relaxed">{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    );
  };

  // Render inline highlighted elements
  const renderInlineHighlights = (text: string) => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      const medMatch = remaining.match(/<med>([^<]+)<\/med>/);
      const symptomMatch = remaining.match(/<symptom>([^<]+)<\/symptom>/);
      const condMatch = remaining.match(/<condition>([^<]+)<\/condition>/);

      let firstMatch: { type: "med" | "symptom" | "condition"; index: number; text: string; fullMatch: string } | null = null;

      if (medMatch && medMatch.index !== undefined) {
        if (!firstMatch || medMatch.index < firstMatch.index) {
          firstMatch = { type: "med", index: medMatch.index, text: medMatch[1], fullMatch: medMatch[0] };
        }
      }
      if (symptomMatch && symptomMatch.index !== undefined) {
        if (!firstMatch || symptomMatch.index < firstMatch.index) {
          firstMatch = { type: "symptom", index: symptomMatch.index, text: symptomMatch[1], fullMatch: symptomMatch[0] };
        }
      }
      if (condMatch && condMatch.index !== undefined) {
        if (!firstMatch || condMatch.index < firstMatch.index) {
          firstMatch = { type: "condition", index: condMatch.index, text: condMatch[1], fullMatch: condMatch[0] };
        }
      }

      if (firstMatch) {
        if (firstMatch.index > 0) {
          parts.push(<span key={key++}>{remaining.substring(0, firstMatch.index)}</span>);
        }

        const colorMap = {
          med: "bg-green-500/15 text-green-700 dark:text-green-400",
          symptom: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
          condition: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
        };
        const iconMap = {
          med: <Pill className="h-4 w-4" />,
          symptom: <Activity className="h-4 w-4" />,
          condition: <HeartPulse className="h-4 w-4" />,
        };

        parts.push(
          <span key={key++} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${colorMap[firstMatch.type]} font-medium`}>
            {iconMap[firstMatch.type]}
            {firstMatch.text}
          </span>
        );

        remaining = remaining.substring(firstMatch.index + firstMatch.fullMatch.length);
      } else {
        parts.push(<span key={key++}>{remaining}</span>);
        break;
      }
    }

    return parts;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "severe":
        return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30";
      case "moderate":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
      default:
        return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-primary bg-card p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t("patientProfile.aiSummaryGenerating")}</p>
        </div>
      </div>
    );
  }

  if (!summaryData) {
    return (
      <div className="rounded-xl border border-primary bg-card p-8 text-center">
        <p className="text-muted-foreground mb-4">{t("patientProfile.aiSummaryEmpty")}</p>
        <Button onClick={generateSummary} className="gap-2">
          <Sparkles className="h-4 w-4" />
          {t("patientProfile.aiSummaryGenerate")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Blood Type Badge */}
      {patient.blood_type && (
        <div className="flex items-center gap-2 -mt-2">
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-0 text-xs font-bold">
            <Droplets className="h-4 w-4 mr-1" />
            Blood Type: {patient.blood_type}
          </Badge>
        </div>
      )}

      {/* Emergency Contact (visible to doctors and patient) */}
      {(() => {
        const primary = patient.emergency_contact_name
          ? {
              name: patient.emergency_contact_name,
              phone: patient.emergency_contact_phone,
              email: patient.emergency_contact_email,
              relationship: patient.emergency_contact_relationship,
            }
          : Array.isArray(patient.emergency_contacts) && patient.emergency_contacts.length > 0
            ? patient.emergency_contacts[0]
            : null;
        if (!primary?.name) return null;
        return (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              <h4 className="font-semibold text-sm text-foreground">Emergency Contact</h4>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-sm uppercase tracking-wide text-muted-foreground">Name</p>
                <p className="font-medium text-foreground">
                  {primary.name}
                  {primary.relationship && (
                    <span className="text-muted-foreground font-normal"> ({primary.relationship})</span>
                  )}
                </p>
              </div>
              {primary.phone && (
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">Phone</p>
                  <a href={`tel:${primary.phone}`} className="flex items-center gap-1.5 font-medium text-primary hover:underline">
                    <Phone className="h-3.5 w-3.5" />
                    {primary.phone}
                  </a>
                </div>
              )}
              {primary.email && (
                <div className="sm:col-span-2">
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">Email</p>
                  <a href={`mailto:${primary.email}`} className="flex items-center gap-1.5 font-medium text-primary hover:underline break-all">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {primary.email}
                  </a>
                </div>
              )}
            </div>
          </div>
        );
      })()}


      {/* AI Summary Card - Timeline */}
      <div className="rounded-xl border border-primary bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t("patientProfile.aiSummaryTitle")}</h3>
              <p className="text-xs text-muted-foreground">{t("patientProfile.aiSummarySubtitle")}</p>
            </div>
          </div>
          {!isSelfService && (
            <Button variant="ghost" size="sm" onClick={generateSummary} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              {t("patientProfile.aiSummaryRefresh")}
            </Button>
          )}
        </div>

        {/* Overall AI narrative summary first */}
        {summaryData.summary && (
          <div className="mb-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{t("patientProfile.aiSummarySectionSummary")}</h4>
            <p className="text-sm text-foreground leading-relaxed">
              {summaryData.summary.replace(/<\/?(?:med|symptom|condition)>/g, '').split(/(?<=[.!?])\s+/).slice(0, 3).join(' ')}
            </p>
          </div>
        )}

        {/* Timeline breakdown */}
        <div className="prose prose-sm max-w-none">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t("patientProfile.aiSummarySectionTimeline")}</h4>
          {renderSummaryTimeline(summaryData.summary)}
        </div>
      </div>

      {/* Legend — Allergy, Condition, Medication, Symptom */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-500/15 text-red-700 dark:text-red-400 font-medium">
            <AlertTriangle className="h-4 w-4" />
            Allergy
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/15 text-blue-700 dark:text-blue-400 font-medium">
            <HeartPulse className="h-4 w-4" />
            Condition
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-500/15 text-green-700 dark:text-green-400 font-medium">
            <Pill className="h-4 w-4" />
            Medication
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 font-medium">
            <Activity className="h-4 w-4" />
            Symptom
          </span>
        </div>
      </div>

      {/* Chronic Medication Badge + Adherence Streak */}
      {patient.is_chronic && (
        <ChronicAdherenceSection patientId={patient.id} patientName={patient.name} />
      )}

      {/* Conflicting Medication Alert */}
      {summaryData.conflicts && summaryData.conflicts.length > 0 && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <h4 className="font-semibold text-foreground">Conflicting Medication Alert</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            The following medications may conflict with each other or with patient allergies. Please review before prescribing.
          </p>
          <div className="space-y-3">
            {summaryData.conflicts.map((conflict, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  conflict.severity === "high"
                    ? "bg-red-500/10 border-red-500/30"
                    : conflict.severity === "moderate"
                    ? "bg-orange-500/10 border-orange-500/30"
                    : "bg-yellow-500/10 border-yellow-500/30"
                }`}
              >
                <div
                  className={`shrink-0 mt-0.5 w-2 h-2 rounded-full ${
                    conflict.severity === "high"
                      ? "bg-red-500"
                      : conflict.severity === "moderate"
                      ? "bg-orange-500"
                      : "bg-yellow-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-card border-border text-foreground font-medium">
                      <Pill className="h-4 w-4 mr-1" />
                      {conflict.medication1}
                    </Badge>
                    {conflict.medication2 && (
                      <>
                        <span className="text-muted-foreground text-xs">+</span>
                        <Badge variant="outline" className="bg-card border-border text-foreground font-medium">
                          <Pill className="h-4 w-4 mr-1" />
                          {conflict.medication2}
                        </Badge>
                      </>
                    )}
                    <Badge
                      variant="outline"
                      className={`ml-auto capitalize text-xs ${
                        conflict.severity === "high"
                          ? "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30"
                          : conflict.severity === "moderate"
                          ? "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30"
                          : "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
                      }`}
                    >
                      {conflict.severity} risk
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5">{conflict.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Allergies & Conditions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Collapsible defaultOpen={false} className="rounded-xl border border-red-500/30 bg-red-500/5 p-5">
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
            <ChevronDown className="h-4 w-4 text-red-600 transition-transform data-[state=closed]:rotate-[-90deg]" />
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <h4 className="font-medium text-foreground">Allergies</h4>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="flex flex-wrap gap-2">
              {summaryData.allergies.length > 0 ? (
                summaryData.allergies.map((allergy, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className={`${getSeverityColor(allergy.severity)} capitalize`}
                  >
                    {allergy.name} ({allergy.severity})
                  </Badge>
                ))
              ) : patient.allergies ? (
                <span className="text-sm text-foreground">{patient.allergies}</span>
              ) : (
                <span className="text-sm text-muted-foreground italic">No allergies recorded</span>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card p-5">
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
            <ChevronDown className="h-4 w-4 text-blue-600 transition-transform data-[state=closed]:rotate-[-90deg]" />
            <HeartPulse className="h-4 w-4 text-blue-600" />
            <h4 className="font-medium text-foreground">Conditions / Diagnoses</h4>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            {summaryData.conditions.length > 0 ? (
              <div className="space-y-2">
                {summaryData.conditions.map((cond, i) => (
                  <div key={i} className="text-sm flex items-center justify-between gap-2 group">
                    <div className="flex items-start gap-2 flex-1">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${cond.status === "active" ? "bg-blue-500" : "bg-muted-foreground/60"}`} />
                      <div className={cond.status === "inactive" ? "text-muted-foreground line-through decoration-muted-foreground/50" : ""}>
                        <span className={cond.status === "inactive" ? "text-muted-foreground" : "text-foreground font-medium"}>{cond.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs no-underline">({cond.date})</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 transition-opacity"

                      onClick={() => toggleStatus("conditions", i)}
                    >
                      {cond.status === "active" ? (
                        <span className="flex items-center gap-1 text-xs text-blue-600"><Check className="h-4 w-4" /> Active</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><X className="h-4 w-4" /> Resolved</span>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No conditions/diagnoses recorded</p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Medications and Symptoms */}
      <div className="grid gap-4 md:grid-cols-2">
        <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card p-5">
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
            <ChevronDown className="h-4 w-4 text-green-600 transition-transform data-[state=closed]:rotate-[-90deg]" />
            <Pill className="h-4 w-4 text-green-600" />
            <h4 className="font-medium text-foreground">Medications</h4>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            {summaryData.medications.length > 0 ? (
              <ul className="space-y-2">
                {summaryData.medications.map((med, i) => (
                  <li key={i} className="text-sm flex items-center justify-between gap-2 group">
                    <div className="flex items-start gap-2 flex-1">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${med.status === "active" ? "bg-green-500" : "bg-muted-foreground/60"}`} />
                      <div className={med.status === "inactive" ? "text-muted-foreground line-through decoration-muted-foreground/50" : ""}>
                        <span className={med.status === "inactive" ? "text-muted-foreground" : "text-foreground font-medium"}>{med.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs no-underline">({med.date})</span>
                        {med.status === "inactive" && med.end_date && (
                          <span className="text-muted-foreground ml-2 text-xs no-underline italic">
                            Stopped {(() => { try { return format(new Date(med.end_date), "d MMM yyyy"); } catch { return med.end_date; } })()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 transition-opacity"

                      onClick={() => toggleStatus("medications", i)}
                    >
                      {med.status === "active" ? (
                        <span className="flex items-center gap-1 text-xs text-green-600"><Check className="h-4 w-4" /> In Use</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><X className="h-4 w-4" /> Not Used</span>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">No medications recorded</p>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card p-5">
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
            <ChevronDown className="h-4 w-4 text-amber-600 transition-transform data-[state=closed]:rotate-[-90deg]" />
            <Activity className="h-4 w-4 text-amber-600" />
            <h4 className="font-medium text-foreground">Symptoms</h4>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            {summaryData.symptoms.length > 0 ? (
              <ul className="space-y-2">
                {summaryData.symptoms.map((symptom, i) => (
                  <li key={i} className="text-sm flex items-center justify-between gap-2 group">
                    <div className="flex items-start gap-2 flex-1">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${symptom.status === "active" ? "bg-amber-500" : "bg-muted-foreground/60"}`} />
                      <div className={symptom.status === "inactive" ? "text-muted-foreground line-through decoration-muted-foreground/50" : ""}>
                        <span className={symptom.status === "inactive" ? "text-muted-foreground" : "text-foreground font-medium"}>{symptom.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs no-underline">({symptom.date})</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 transition-opacity"
                      onClick={() => toggleStatus("symptoms", i)}
                    >
                      {symptom.status === "active" ? (
                        <span className="flex items-center gap-1 text-xs text-amber-600"><Check className="h-4 w-4" /> Active</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><X className="h-4 w-4" /> Resolved</span>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">No symptoms recorded</p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
