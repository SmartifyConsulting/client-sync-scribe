import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toastError } from "@/lib/userMessage";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Props {
  admissionId: string;
  recordTable: string;
  recordId: string;
  nurseId: string | null;
  nurseName?: string | null;
}

const COOLDOWN_MS = 4 * 60 * 60 * 1000;

/**
 * Compact 1–5 star rating + optional comment control for each admission record
 * line. Patients may submit at most one rating per nurse every 4 hours (enforced
 * by DB trigger `enforce_nurse_rating_cooldown`).
 */
export function RateNurseControl({ admissionId, recordTable, recordId, nurseId, nurseName }: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>("");
  const [savedComment, setSavedComment] = useState<string>("");
  const [showComment, setShowComment] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // Load this record's existing rating + comment (if any)
  useEffect(() => {
    if (!userId || !nurseId) return;
    supabase
      .from("nurse_record_ratings" as any)
      .select("rating, comment")
      .eq("record_table", recordTable)
      .eq("record_id", recordId)
      .eq("patient_user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        const r = (data as any)?.rating ?? null;
        const c = (data as any)?.comment ?? "";
        setRating(r);
        setSavedComment(c);
        setComment(c);
      });
  }, [userId, nurseId, recordTable, recordId]);

  // Load most-recent rating by this patient for this nurse to compute cooldown
  useEffect(() => {
    if (!userId || !nurseId) return;
    supabase
      .from("nurse_record_ratings" as any)
      .select("created_at")
      .eq("patient_user_id", userId)
      .eq("nurse_id", nurseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const iso = (data as any)?.created_at;
        if (!iso) return;
        const t = new Date(iso).getTime();
        if (Date.now() - t < COOLDOWN_MS) setCooldownUntil(t + COOLDOWN_MS);
      });
  }, [userId, nurseId]);

  // Tick the countdown once a minute while cooling down
  useEffect(() => {
    if (!cooldownUntil) return;
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  if (!nurseId || !userId) return null;

  const cooling = cooldownUntil !== null && cooldownUntil > now;
  const remainingMs = cooling ? cooldownUntil! - now : 0;
  const remainingH = Math.floor(remainingMs / (60 * 60 * 1000));
  const remainingM = Math.floor((remainingMs % (60 * 60 * 1000)) / 60000);

  const submit = async (value: number, note: string) => {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase
      .from("nurse_record_ratings" as any)
      .upsert(
        {
          admission_id: admissionId,
          record_table: recordTable,
          record_id: recordId,
          nurse_id: nurseId,
          patient_user_id: userId,
          rating: value,
          comment: note?.trim() ? note.trim() : null,
        },
        { onConflict: "record_table,record_id,patient_user_id" },
      );
    setBusy(false);
    if (error) {
      if (error.message?.includes("NURSE_RATING_COOLDOWN")) {
        toast.error("You can only rate this nurse once every 4 hours.");
        setCooldownUntil(Date.now() + COOLDOWN_MS);
      } else {
        toastError(error, "We couldn't complete that. Please try again.");
      }
      return;
    }
    setRating(value);
    setSavedComment(note?.trim() || "");
    setShowComment(false);
    setCooldownUntil(Date.now() + COOLDOWN_MS);
    toast.success(`Thanks for rating ${nurseName || "the nurse"}!`);
  };

  const handleStar = (v: number) => {
    if (cooling) return;
    // If a comment is being drafted, submit both; otherwise submit rating only
    submit(v, comment);
  };

  const submitCommentOnly = () => {
    if (cooling || !rating) return;
    submit(rating, comment);
  };

  return (
    <div className="mt-1 space-y-1">
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs text-muted-foreground mr-1">
          Rate {nurseName || "nurse"}:
        </span>
        {[1, 2, 3, 4, 5].map((v) => {
          const filled = (hover ?? rating ?? 0) >= v;
          return (
            <button
              key={v}
              type="button"
              disabled={busy || cooling}
              onMouseEnter={() => !cooling && setHover(v)}
              onMouseLeave={() => setHover(null)}
              onClick={() => handleStar(v)}
              className="p-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label={`Rate ${v} stars`}
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5 transition-colors",
                  filled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40",
                )}
              />
            </button>
          );
        })}
        {rating !== null && !showComment && !cooling && (
          <button
            type="button"
            onClick={() => setShowComment(true)}
            className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5 ml-1"
          >
            <MessageSquarePlus className="h-3 w-3" />
            {savedComment ? "Edit note" : "Add a note"}
          </button>
        )}
      </div>

      {savedComment && !showComment && (
        <p className="text-[11px] italic text-muted-foreground pl-1">"{savedComment}"</p>
      )}

      {showComment && !cooling && (
        <div className="space-y-1 pl-1">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share an observation about this nurse (optional)"
            className="min-h-[52px] text-xs"
            maxLength={500}
          />
          <div className="flex gap-1 justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setComment(savedComment);
                setShowComment(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              onClick={submitCommentOnly}
              disabled={busy || !rating}
            >
              Save note
            </Button>
          </div>
        </div>
      )}

      {cooling && (
        <p className="text-[11px] text-muted-foreground pl-1">
          You can rate {nurseName || "this nurse"} again in {remainingH > 0 ? `${remainingH}h ` : ""}
          {remainingM}m.
        </p>
      )}
    </div>
  );
}
