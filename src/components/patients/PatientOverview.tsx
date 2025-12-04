import { useState, useEffect } from "react";
import { Loader2, Sparkles, Pill, HeartPulse, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  };
  sessions: Session[];
}

interface SummaryData {
  summary: string;
  medications: string[];
  conditions: string[];
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

      setSummaryData(data);
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

  // Parse and render summary with highlighted medications and conditions
  const renderSummary = (text: string) => {
    // Replace <med> tags with green styled spans
    // Replace <condition> tags with blue styled spans
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      const medMatch = remaining.match(/<med>([^<]+)<\/med>/);
      const condMatch = remaining.match(/<condition>([^<]+)<\/condition>/);

      let firstMatch: { type: "med" | "condition"; index: number; text: string; fullMatch: string } | null = null;

      if (medMatch && medMatch.index !== undefined) {
        if (!firstMatch || medMatch.index < firstMatch.index) {
          firstMatch = { type: "med", index: medMatch.index, text: medMatch[1], fullMatch: medMatch[0] };
        }
      }
      if (condMatch && condMatch.index !== undefined) {
        if (!firstMatch || condMatch.index < firstMatch.index) {
          firstMatch = { type: "condition", index: condMatch.index, text: condMatch[1], fullMatch: condMatch[0] };
        }
      }

      if (firstMatch) {
        // Add text before the match
        if (firstMatch.index > 0) {
          parts.push(<span key={key++}>{remaining.substring(0, firstMatch.index)}</span>);
        }

        // Add the highlighted match
        if (firstMatch.type === "med") {
          parts.push(
            <span
              key={key++}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/15 text-green-700 dark:text-green-400 font-medium"
            >
              <Pill className="h-3 w-3" />
              {firstMatch.text}
            </span>
          );
        } else {
          parts.push(
            <span
              key={key++}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-400 font-medium"
            >
              <HeartPulse className="h-3 w-3" />
              {firstMatch.text}
            </span>
          );
        }

        remaining = remaining.substring(firstMatch.index + firstMatch.fullMatch.length);
      } else {
        // No more matches, add remaining text
        parts.push(<span key={key++}>{remaining}</span>);
        break;
      }
    }

    return parts;
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
      {/* AI Summary Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">AI Patient Summary</h3>
              <p className="text-xs text-muted-foreground">Generated from complete patient history</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={generateSummary} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
        <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
          {renderSummary(summaryData.summary)}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-500/15 text-green-700 dark:text-green-400 font-medium">
            <Pill className="h-3 w-3" />
            Medication
          </span>
          <span className="text-muted-foreground">Medications prescribed or discussed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/15 text-blue-700 dark:text-blue-400 font-medium">
            <HeartPulse className="h-3 w-3" />
            Condition
          </span>
          <span className="text-muted-foreground">Conditions or symptoms identified</span>
        </div>
      </div>

      {/* Quick Reference Lists */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Medications List */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Pill className="h-4 w-4 text-green-600" />
            <h4 className="font-medium text-foreground">Medications</h4>
          </div>
          {summaryData.medications.length > 0 ? (
            <ul className="space-y-1.5">
              {summaryData.medications.map((med, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {med}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">No medications recorded</p>
          )}
        </div>

        {/* Conditions List */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <HeartPulse className="h-4 w-4 text-blue-600" />
            <h4 className="font-medium text-foreground">Conditions</h4>
          </div>
          {summaryData.conditions.length > 0 ? (
            <ul className="space-y-1.5">
              {summaryData.conditions.map((cond, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {cond}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">No conditions recorded</p>
          )}
        </div>
      </div>
    </div>
  );
}
