import { useEffect, useMemo, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  SECTION_TRIGGER_ALWAYS_GREEN_CLASS,
  SECTION_CONTENT_CLASS,
  SECTION_FRAME_CLASS,
} from "@/components/ui/section-accordion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Lock, Sparkles, Trash2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SIGNATURE_FONTS, getSignatureFontFamily } from "@/lib/signature";
import { format, parseISO, isToday, differenceInCalendarDays } from "date-fns";

interface JournalEntry {
  id: string;
  entry_date: string;
  body: string;
  font_key: string | null;
  created_at: string;
}

interface InsightRow {
  entry_id: string | null;
  summation: string | null;
}

const PRIVACY_NOTE =
  "This journal is private. Only you can read what you write here. Your care team never sees these entries — only a short, generalised note may appear in your health summary.";

const SOMATIC_NOTE =
  "Emotions have a somatological effect: sustained stress, grief, anger or fear commonly express themselves physically — muscle tension, headaches, pain, disturbed sleep and digestive changes. This is general information, not a diagnosis.";

function bucketOf(dateStr: string): "Today" | "This week" | "This month" | "Earlier" {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return "Today";
    const diff = differenceInCalendarDays(new Date(), d);
    if (diff <= 7) return "This week";
    if (diff <= 31) return "This month";
    return "Earlier";
  } catch {
    return "Earlier";
  }
}

const BUCKETS = ["Today", "This week", "This month", "Earlier"] as const;

export function EmotionalJournal({ patientId }: { patientId: string }) {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [body, setBody] = useState("");
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [fontKey, setFontKey] = useState<string>(SIGNATURE_FONTS[7].value);

  const isOwner = !!userId && !!ownerUserId && userId === ownerUserId;

  const load = async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id ?? null;
      setUserId(uid);

      const { data: pat } = await supabase
        .from("patients")
        .select("patient_user_id")
        .eq("id", patientId)
        .maybeSingle();
      const owner = (pat as any)?.patient_user_id ?? null;
      setOwnerUserId(owner);

      if (uid && owner && uid === owner) {
        const { data } = await supabase
          .from("patient_emotional_journal")
          .select("id, entry_date, body, font_key, created_at")
          .eq("patient_user_id", uid)
          .order("entry_date", { ascending: false })
          .order("created_at", { ascending: false });
        setEntries((data as any) || []);
        if (data && data.length && (data as any)[0].font_key) setFontKey((data as any)[0].font_key);
      } else {
        setEntries([]);
      }

      const { data: ins } = await supabase
        .from("patient_emotional_insights")
        .select("entry_id, summation")
        .eq("patient_id", patientId)
        .order("generated_at", { ascending: false });
      setInsights((ins as any) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const summationFor = (entryId: string) =>
    insights.find((i) => i.entry_id === entryId)?.summation || null;

  const runAnalysis = async () => {
    setAnalysing(true);
    try {
      const { error } = await supabase.functions.invoke("analyze-emotional-journal", {
        body: { patientId },
      });
      if (error) throw error;
      await load();
    } catch (e: any) {
      toast({ title: "Could not analyse journal", description: e.message, variant: "destructive" });
    } finally {
      setAnalysing(false);
    }
  };

  const save = async () => {
    if (!body.trim() || !userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("patient_emotional_journal").insert({
        patient_user_id: userId,
        entry_date: entryDate,
        body: body.trim(),
        font_key: fontKey,
      });
      if (error) throw error;
      setBody("");
      await load();
      runAnalysis();
    } catch (e: any) {
      toast({ title: "Could not save entry", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("patient_emotional_journal").delete().eq("id", id);
    if (error) {
      toast({ title: "Could not delete entry", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const grouped = useMemo(() => {
    const map: Record<string, JournalEntry[]> = {};
    for (const e of entries) {
      const b = bucketOf(e.entry_date);
      (map[b] ||= []).push(e);
    }
    return map;
  }, [entries]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isOwner && (
        <>
          <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <Lock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-foreground leading-relaxed">{PRIVACY_NOTE}</p>
          </div>

          <div className="rounded-xl border border-primary bg-card p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-foreground">Date</p>
                <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-foreground">Handwriting</p>
                <Select value={fontKey} onValueChange={setFontKey}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIGNATURE_FONTS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        <span style={{ fontFamily: f.fontFamily }}>{f.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="What is happening for you emotionally right now?"
              style={{ fontFamily: getSignatureFontFamily(fontKey), fontSize: "18px" }}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={runAnalysis} disabled={analysing} className="gap-2">
                {analysing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Analyse journal
              </Button>
              <Button size="sm" onClick={save} disabled={saving || !body.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save entry"}
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-foreground leading-relaxed">{SOMATIC_NOTE}</p>
          </div>
        </>
      )}

      {!isOwner && (
        <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <Lock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-foreground leading-relaxed">
            The patient's journal entries are private. Only the short, generalised summations below are shared with the
            care team.
          </p>
        </div>
      )}

      {isOwner ? (
        <Accordion type="multiple" className={SECTION_FRAME_CLASS}>
          {BUCKETS.filter((b) => grouped[b]?.length).map((b) => (
            <AccordionItem key={b} value={b} className="border-0">
              <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}>
                <span className="text-sm font-semibold">
                  {b} <span className="section-count-pill ml-2 rounded-full px-2 py-0.5 text-xs">{grouped[b].length}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className={SECTION_CONTENT_CLASS}>
                {grouped[b].map((e) => (
                  <div key={e.id} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground">
                        {format(parseISO(e.entry_date), "d MMM yyyy")}
                      </p>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(e.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    {summationFor(e.id) && (
                      <p className="text-xs font-bold text-orange-600">{summationFor(e.id)}</p>
                    )}
                    <p
                      className="text-foreground whitespace-pre-wrap"
                      style={{ fontFamily: getSignatureFontFamily(e.font_key), fontSize: "18px" }}
                    >
                      {e.body}
                    </p>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className={SECTION_FRAME_CLASS}>
          {insights.filter((i) => i.summation).length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No emotional summations recorded.</p>
          ) : (
            insights
              .filter((i) => i.summation)
              .map((i, idx) => (
                <div key={idx} className="border-b border-border last:border-0 px-4 py-2">
                  <p className="text-xs font-bold text-orange-600">{i.summation}</p>
                </div>
              ))
          )}
        </div>
      )}

      {isOwner && entries.length === 0 && (
        <p className="text-sm text-muted-foreground">No journal entries yet.</p>
      )}
    </div>
  );
}
