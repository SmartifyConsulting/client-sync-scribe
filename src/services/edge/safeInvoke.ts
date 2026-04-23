/**
 * Edge function call helpers.
 *
 * `safeInvoke()` wraps `supabase.functions.invoke()` so every caller gets a
 * consistent `{ data, error }` shape with toast-friendly error strings.
 *
 * Existing call sites can adopt this incrementally — the underlying
 * `supabase.functions.invoke()` is still available for unmigrated code.
 */

import { supabase } from "@/integrations/supabase/client";

export interface SafeInvokeResult<T = unknown> {
  data: T | null;
  error: string | null;
}

export async function safeInvoke<T = unknown>(
  functionName: string,
  payload?: Record<string, unknown> | FormData,
): Promise<SafeInvokeResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload as any,
    });
    if (error) {
      return { data: null, error: error.message || `Edge function "${functionName}" failed` };
    }
    return { data: (data as T) ?? null, error: null };
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || `Edge function "${functionName}" threw an exception`,
    };
  }
}
