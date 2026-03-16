import { useState, useEffect } from "react";
import { Loader2, Sparkles, Pill, HeartPulse, RefreshCw, Activity, AlertTriangle, Check, X, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Session } from "@/hooks/useSessions";

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
  };
  sessions: Session[];
}

interface StatusItem {
  name: string;
  date: string;
  status: "active" | "inactive";
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

export function PatientOverview({ patient, sessions }: PatientOverviewProps) {
  const { toast } = useToast();
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

      const processedData: SummaryData = {
        summary: data.summary || "",
        medications: (data.medications || []).map((m: any) => ({
          ...m,
          status: m.status || "active",
        })),
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
          med: <Pill className="h-3 w-3" />,
          symptom: <Activity className="h-3 w-3" />,
          condition: <HeartPulse className="h-3 w-3" />,
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
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Generating AI summary of patient history...</p>
        </div>
      </div>
    );
  }

  if (!summaryData) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground mb-4">No summary available yet.</p>
        <Button onClick={generateSummary} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Generate Summary
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Summary Card - Timeline */}
      <div className="rounded-xl border border-primary bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">AI Patient Summary</h3>
              <p className="text-xs text-muted-foreground">Summarized from all session transcriptions and history</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={generateSummary} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
        <div className="prose prose-sm max-w-none">
          {renderSummaryTimeline(summaryData.summary)}
        </div>
      </div>

      {/* Legend — Allergy, Condition, Medication, Symptom */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-500/15 text-red-700 dark:text-red-400 font-medium">
            <AlertTriangle className="h-3 w-3" />
            Allergy
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/15 text-blue-700 dark:text-blue-400 font-medium">
            <HeartPulse className="h-3 w-3" />
            Condition
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-500/15 text-green-700 dark:text-green-400 font-medium">
            <Pill className="h-3 w-3" />
            Medication
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 font-medium">
            <Activity className="h-3 w-3" />
            Symptom
          </span>
        </div>
      </div>

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
                      <Pill className="h-3 w-3 mr-1" />
                      {conflict.medication1}
                    </Badge>
                    {conflict.medication2 && (
                      <>
                        <span className="text-muted-foreground text-xs">+</span>
                        <Badge variant="outline" className="bg-card border-border text-foreground font-medium">
                          <Pill className="h-3 w-3 mr-1" />
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

      {/* Allergies Section - Always visible */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <h4 className="font-medium text-foreground">Allergies</h4>
          </div>
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
        </div>

        {/* Conditions */}
        <div className="rounded-xl border border-primary bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <HeartPulse className="h-4 w-4 text-blue-600" />
            <h4 className="font-medium text-foreground">Conditions / Diagnoses</h4>
          </div>
          {summaryData.conditions.length > 0 ? (
            <div className="space-y-2">
              {summaryData.conditions.map((cond, i) => (
                <div key={i} className="text-sm flex items-center justify-between gap-2 group">
                  <div className="flex items-start gap-2 flex-1">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${cond.status === "active" ? "bg-blue-500" : "bg-muted-foreground/40"}`} />
                    <div className={cond.status === "inactive" ? "text-muted-foreground/50" : ""}>
                      <span className={cond.status === "inactive" ? "text-muted-foreground/50" : "text-foreground font-medium"}>{cond.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">({cond.date})</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => toggleStatus("conditions", i)}
                  >
                    {cond.status === "active" ? (
                      <span className="flex items-center gap-1 text-xs text-blue-600"><Check className="h-3 w-3" /> Active</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><X className="h-3 w-3" /> Resolved</span>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No conditions/diagnoses recorded</p>
          )}
        </div>
      </div>

      {/* Medications and Symptoms */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Medications List */}
        <div className="rounded-xl border border-primary bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Pill className="h-4 w-4 text-green-600" />
            <h4 className="font-medium text-foreground">Medications</h4>
          </div>
          {summaryData.medications.length > 0 ? (
            <ul className="space-y-2">
              {summaryData.medications.map((med, i) => (
                <li key={i} className="text-sm flex items-center justify-between gap-2 group">
                  <div className="flex items-start gap-2 flex-1">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${med.status === "active" ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                    <div className={med.status === "inactive" ? "text-muted-foreground/50" : ""}>
                      <span className={med.status === "inactive" ? "text-muted-foreground/50" : "text-foreground font-medium"}>{med.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">({med.date})</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => toggleStatus("medications", i)}
                  >
                    {med.status === "active" ? (
                      <span className="flex items-center gap-1 text-xs text-green-600"><Check className="h-3 w-3" /> In Use</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><X className="h-3 w-3" /> Not Used</span>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">No medications recorded</p>
          )}
        </div>

        {/* Symptoms List */}
        <div className="rounded-xl border border-primary bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-amber-600" />
            <h4 className="font-medium text-foreground">Symptoms</h4>
          </div>
          {summaryData.symptoms.length > 0 ? (
            <ul className="space-y-2">
              {summaryData.symptoms.map((symptom, i) => (
                <li key={i} className="text-sm flex items-center justify-between gap-2 group">
                  <div className="flex items-start gap-2 flex-1">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${symptom.status === "active" ? "bg-amber-500" : "bg-muted-foreground/40"}`} />
                    <div className={symptom.status === "inactive" ? "text-muted-foreground/50" : ""}>
                      <span className={symptom.status === "inactive" ? "text-muted-foreground/50" : "text-foreground font-medium"}>{symptom.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">({symptom.date})</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => toggleStatus("symptoms", i)}
                  >
                    {symptom.status === "active" ? (
                      <span className="flex items-center gap-1 text-xs text-amber-600"><Check className="h-3 w-3" /> Active</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><X className="h-3 w-3" /> Resolved</span>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">No symptoms recorded</p>
          )}
        </div>
      </div>
    </div>
  );
}
