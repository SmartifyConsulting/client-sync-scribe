import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toastError } from "@/lib/userMessage";

interface Props {
  admissionId: string;
  recordTable: string;
  recordId: string;
  nurseId: string | null;
  nurseName?: string | null;
}

/**
 * Compact 5-star rating control patients can use on each admission record line
 * to rate the nurse who recorded it. Awards Vulas to the nurse on rating >= 4.
 */
export function RateNurseControl({ admissionId, recordTable, recordId, nurseId, nurseName }: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId || !nurseId) return;
    supabase
      .from("nurse_record_ratings" as any)
      .select("rating")
      .eq("record_table", recordTable)
      .eq("record_id", recordId)
      .eq("patient_user_id", userId)
      .maybeSingle()
      .then(({ data }) => setRating((data as any)?.rating ?? null));
  }, [userId, nurseId, recordTable, recordId]);

  if (!nurseId || !userId) return null;

  const submit = async (value: number) => {
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
        },
        { onConflict: "record_table,record_id,patient_user_id" },
      );
    setBusy(false);
    if (error) {
      toastError(error, "We couldn't complete that. Please try again.");
      return;
    }
    setRating(value);
    toast.success(`Thanks for rating ${nurseName || "the nurse"}!`);
  };

  return (
    <div className="flex items-center gap-1 mt-1">
      <span className="text-[10px] text-muted-foreground mr-1">Rate {nurseName || "nurse"}:</span>
      {[1, 2, 3, 4, 5].map((v) => {
        const filled = (hover ?? rating ?? 0) >= v;
        return (
          <button
            key={v}
            type="button"
            disabled={busy}
            onMouseEnter={() => setHover(v)}
            onMouseLeave={() => setHover(null)}
            onClick={() => submit(v)}
            className="p-0.5"
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
    </div>
  );
}
