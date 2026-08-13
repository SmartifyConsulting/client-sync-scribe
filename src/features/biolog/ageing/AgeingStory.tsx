import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BiologicalAgeAssessment } from "./types";
import type { BiologEntry } from "../types";

interface Props {
  assessments: BiologicalAgeAssessment[];
  entries: BiologEntry[];
  readOnly?: boolean;
}

/** AI narrative over the person's own data. Never causal, never about lifespan. */
export function AgeingStory({ assessments, entries, readOnly }: Props) {
  const [story, setStory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const enoughData = assessments.length >= 1 && entries.length >= 5;

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("biolog-ageing-insights", {
        body: {
          assessments: assessments.slice(0, 10),
          entries: entries.slice(0, 90).map((e) => ({ date: e.entry_date, payload: e.payload })),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStory(data?.story || null);
      if (!data?.story) toast.info("Not enough data yet to describe a pattern.");
    } catch (e) {
      toast.error((e as Error).message || "Could not generate your ageing story.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Your Ageing Story</p>
          <p className="text-xs text-muted-foreground">A plain-language read of what your own data shows.</p>
        </div>
        {enoughData && !readOnly && (
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={generate} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {story ? "Regenerate" : "Generate"}
          </Button>
        )}
      </div>

      {!enoughData ? (
        <p className="text-xs text-muted-foreground">
          Not enough data yet. Keep logging day to day and add a biological-age assessment to build your story.
        </p>
      ) : story ? (
        <div className="space-y-2">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{story}</p>
          <p className="text-[11px] text-muted-foreground">
            These are associations in your own records over time. They do not show that one thing caused another.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Generate a summary of how your ageing data has moved over time.</p>
      )}
    </div>
  );
}
