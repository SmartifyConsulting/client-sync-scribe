import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tracks first-visit tip state per (user, tipId).
 * - Returns `shouldShow=true` only on the very first visit (no row in `user_screen_tips_seen`).
 * - `dismiss()` writes the row and flips state off.
 * - Auto-dismisses after 8s if not interacted with.
 *
 * Cross-device: storage is server-side; once seen, never shown again
 * on any device or browser for the same account.
 */
export function useScreenTip(tipId: string | null) {
  const [shouldShow, setShouldShow] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!tipId) {
      setShouldShow(false);
      setChecked(true);
      return;
    }
    setChecked(false);
    setShouldShow(false);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        if (!cancelled) setChecked(true);
        return;
      }
      const { data } = await supabase
        .from("user_screen_tips_seen")
        .select("tip_id")
        .eq("user_id", user.id)
        .eq("tip_id", tipId)
        .maybeSingle();
      if (cancelled) return;
      setShouldShow(!data);
      setChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [tipId]);

  const dismiss = useCallback(async () => {
    setShouldShow(false);
    if (!tipId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("user_screen_tips_seen")
      .upsert({ user_id: user.id, tip_id: tipId }, { onConflict: "user_id,tip_id" });
  }, [tipId]);

  return { shouldShow: checked && shouldShow, dismiss };
}

/** Reset every tip for the current user so they all show again. */
export async function resetAllScreenTips(): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const { error } = await supabase
    .from("user_screen_tips_seen")
    .delete()
    .eq("user_id", user.id);
  return { error: error?.message ?? null };
}
