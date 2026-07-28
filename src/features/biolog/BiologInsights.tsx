import { useMemo, useState } from "react";
import { Loader2, Sparkles, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  BUILT_IN_CORRELATIONS,
  CorrelationDefinition,
  computeInsight,
} from "./correlations";
import { useBiologCorrelations, useBiologEntries, useSaveCorrelation } from "./useBiolog";

interface Props {
  ownerUserId?: string;
  readOnly?: boolean;
}

export function BiologInsights({ ownerUserId, readOnly }: Props) {
  const { data: entries = [], isLoading } = useBiologEntries(ownerUserId, 365);
  const { data: customRows = [] } = useBiologCorrelations(ownerUserId);
  const saveCorrelation = useSaveCorrelation(ownerUserId);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<
    { title: string; input_variable: string; outcome_variables: string[]; rationale?: string }[]
  >([]);

  const definitions: CorrelationDefinition[] = useMemo(() => {
    const disabled = new Set(
      customRows.filter((r) => !r.enabled && !r.is_custom).map((r) => r.title),
    );
    const custom = customRows
      .filter((r) => r.is_custom && r.enabled)
      .map((r) => ({
        id: r.id,
        title: r.title,
        group: r.group_name || "Custom",
        inputVar: r.input_variable,
        outcomeVars: r.outcome_variables,
        description: "Your own correlation.",
        isCustom: true,
      }));
    return [...BUILT_IN_CORRELATIONS.filter((c) => !disabled.has(c.title)), ...custom];
  }, [customRows]);

  const results = useMemo(
    () =>
      definitions
        .map((def) => ({ def, insight: computeInsight(entries, def) }))
        .sort((a, b) => b.insight.strength - a.insight.strength),
    [definitions, entries],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof results>();
    for (const row of results) {
      map.set(row.def.group, [...(map.get(row.def.group) ?? []), row]);
    }
    return Array.from(map.entries());
  }, [results]);

  const handleSuggest = async () => {
    setSuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("biolog-suggest-correlations", {
        body: {
          entries: entries.slice(0, 60).map((e) => ({
            date: e.entry_date,
            ratings: e.payload.ratings,
            foods: (e.payload.meals ?? []).flatMap((m) => m.foods),
            exercises: (e.payload.exercises ?? []).map((x) => x.name),
            medications: (e.payload.medications ?? []).filter((m) => m.taken).map((m) => m.label),
            note: e.note,
          })),
          existing: definitions.map((d) => d.title),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSuggestions(data?.suggestions ?? []);
      if (!(data?.suggestions ?? []).length) toast.info("No new patterns worth tracking yet.");
    } catch (err: any) {
      toast.error(err?.message || "Could not generate suggestions.");
    } finally {
      setSuggesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Based on {entries.length} check-in{entries.length === 1 ? "" : "s"}. Correlation is not
          causation — discuss anything meaningful with your doctor.
        </p>
        {!readOnly && (
          <Button size="sm" variant="outline" onClick={handleSuggest} disabled={suggesting}>
            {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Suggest correlations
          </Button>
        )}
      </div>

      {suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Suggested for you</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestions.map((s, i) => (
              <div
                key={`${s.title}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-300 p-3"
              >
                <div>
                  <p className="text-xs font-bold text-foreground">{s.title}</p>
                  {s.rationale && (
                    <p className="text-[11px] text-muted-foreground">{s.rationale}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await saveCorrelation.mutateAsync({
                      title: s.title,
                      group_name: "Suggested",
                      input_variable: s.input_variable,
                      outcome_variables: s.outcome_variables,
                    });
                    setSuggestions((list) => list.filter((_, idx) => idx !== i));
                    toast.success("Added to your correlations.");
                  }}
                >
                  Track this
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {grouped.map(([group, rows]) => (
        <Card key={group}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{group}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map(({ def, insight }) => {
              const Icon = insight.insufficient
                ? Minus
                : insight.strength >= 5
                  ? TrendingUp
                  : Minus;
              return (
                <div key={def.id} className="rounded-lg border border-neutral-300 p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground">{def.title}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {insight.daysWith} vs {insight.daysWithout} days
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{def.description}</p>
                  {insight.lines.map((line, i) => (
                    <p
                      key={i}
                      className="flex items-start gap-1.5 text-xs text-foreground"
                    >
                      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      {line}
                    </p>
                  ))}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
