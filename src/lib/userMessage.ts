import { toast } from "sonner";

/**
 * Convert an arbitrary error (Supabase, fetch, JS) into a short, friendly,
 * user-facing sentence. Raw DB / network noise is hidden behind the fallback.
 */
export function friendlyMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  const raw = typeof error === "string"
    ? error
    : (error as { message?: string })?.message ?? "";
  if (!raw) return fallback;

  const m = raw.toLowerCase();

  // Network
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("network request failed")) {
    return "We can't reach the server right now. Please check your connection and try again.";
  }

  // Auth
  if (m.includes("jwt expired") || m.includes("invalid jwt") || m.includes("not authenticated")) {
    return "Your session has expired. Please sign in again.";
  }
  if (m.includes("not authorised") || m.includes("not authorized") || m.includes("permission denied") || m.includes("row-level security") || m.includes("rls")) {
    return "You don't have permission to do that.";
  }

  // Common Postgres noise → friendly fallback
  if (
    m.startsWith("pgrst") ||
    m.includes("relation ") ||
    m.includes('column "') ||
    m.includes("violates ") ||
    m.includes("duplicate key") ||
    m.includes("syntax error") ||
    m.includes("invalid input syntax") ||
    m.includes("does not exist")
  ) {
    return fallback;
  }

  // Short, friendly-looking messages from our own RPCs ("Incident not found",
  // "The 30 second ER Provider change window has closed", etc.) — pass through.
  if (raw.length <= 140 && !/[{}<>]/.test(raw)) return raw;

  return fallback;
}

/** Show a friendly error toast and log the raw error for developers. */
export function toastError(error: unknown, fallback: string) {
  // eslint-disable-next-line no-console
  console.error("[toastError]", error);
  toast.error(friendlyMessage(error, fallback));
}
