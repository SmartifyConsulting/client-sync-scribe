/**
 * Records every sign-in so daily login/duration reports are complete,
 * instead of relying on auth sessions that vanish when they expire.
 *
 * A login "session key" is derived from the auth session, so repeated
 * token refreshes or tab reloads keep updating the same row.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

const HEARTBEAT_MS = 60_000;

let activeKey: string | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function keyFor(session: Session): string {
  // Prefer the stable auth session id; fall back to issued-at + user id.
  const claim = (session.user?.id ?? "anon") as string;
  const sessionId =
    (session as unknown as { session_id?: string }).session_id ??
    (parseJwt(session.access_token)?.session_id as string | undefined);
  return sessionId ?? `${claim}:${session.expires_at ?? ""}`;
}

function parseJwt(token?: string): Record<string, unknown> | null {
  try {
    if (!token) return null;
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function stopHeartbeat() {
  if (timer) clearInterval(timer);
  timer = null;
}

/** Called on sign-in (and on session restore) to open or refresh the login row. */
export async function startLoginTracking(session: Session | null) {
  if (!session?.user) return;
  const key = keyFor(session);
  if (key === activeKey && timer) return;

  activeKey = key;
  await supabase.rpc("record_login_event", {
    _session_key: key,
    _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  });

  stopHeartbeat();
  timer = setInterval(() => {
    if (!activeKey) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    void supabase.rpc("touch_login_event", { _session_key: activeKey });
  }, HEARTBEAT_MS);
}

/** Called on sign-out so the row gets a real end time. */
export async function endLoginTracking() {
  const key = activeKey;
  stopHeartbeat();
  activeKey = null;
  if (!key) return;
  await supabase.rpc("end_login_event", { _session_key: key });
}
