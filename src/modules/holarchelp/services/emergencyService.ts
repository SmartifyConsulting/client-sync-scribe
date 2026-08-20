import { supabase } from "@/integrations/supabase/client";

/**
 * Holarc Emergency Engine — central service for triggering and managing SOS
 * events. This wraps the existing holarchelp_incidents / dispatch-sos /
 * share-incident-with-contacts flow so it can be invoked from anywhere
 * (in-app button, a Capacitor native plugin callback, a future Siri/Google
 * Assistant intent handler) without depending on React component state.
 *
 * Deliberately reuses holarchelp_incidents as the event store rather than a
 * separate table — this IS the hospital's emergency_events equivalent.
 */

export type ActivationMethod =
  | "voice"
  | "siri"
  | "google_assistant"
  | "action_button"
  | "hardware"
  | "apple_watch"
  | "android_watch"
  | "in_app"
  | "future";

const ACTIVE_STATUSES = [
  "open",
  "assigned",
  "en_route",
  "arrived",
  "patient_collected",
  "at_hospital",
  "reopened",
];

export interface TriggerSOSOptions {
  activationMethod?: ActivationMethod;
  deviceId?: string;
}

export interface TriggerSOSResult {
  success: boolean;
  incidentId?: string;
  trackingToken?: string;
  locationCaptured: boolean;
  error?: string;
}

// Idempotency guard — a native trigger (Siri, hardware button) firing the
// same request multiple times in quick succession must not create duplicate
// incidents. Any call within the window reuses the in-flight/just-created
// result instead of hitting the database again.
const DUPLICATE_TRIGGER_WINDOW_MS = 15_000;
let lastTriggerAt = 0;
let lastTriggerPromise: Promise<TriggerSOSResult> | null = null;

/**
 * Central entry point for creating an SOS event, regardless of how it was
 * activated. Idempotent within a short window. Never throws — always
 * resolves with a success/failure result so native callers get a clear
 * outcome instead of an unhandled rejection.
 */
export async function triggerEmergencySOS(
  options: TriggerSOSOptions = {}
): Promise<TriggerSOSResult> {
  const now = Date.now();
  if (lastTriggerPromise && now - lastTriggerAt < DUPLICATE_TRIGGER_WINDOW_MS) {
    return lastTriggerPromise;
  }
  lastTriggerAt = now;
  lastTriggerPromise = doTrigger(options).finally(() => {
    // Allow a genuinely new SOS once this call has resolved and the window
    // has passed; keep the reference so bursts inside the window collapse.
  });
  return lastTriggerPromise;
}

async function doTrigger(options: TriggerSOSOptions): Promise<TriggerSOSResult> {
  const activationMethod: ActivationMethod = options.activationMethod ?? "in_app";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated", locationCaptured: false };
  }

  // Reuse an already-active incident instead of creating a duplicate.
  const { data: existing } = await supabase
    .from("holarchelp_incidents" as any)
    .select("id, tracking_token")
    .eq("user_id", user.id)
    .in("status", ACTIVE_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if ((existing as any)?.id) {
    return {
      success: true,
      incidentId: (existing as any).id,
      trackingToken: (existing as any).tracking_token,
      locationCaptured: false,
    };
  }

  // Location capture must never block or fail the SOS — best effort only.
  let pos: GeolocationPosition | null = null;
  try {
    pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      });
    });
  } catch {
    pos = null;
  }

  let coverage: "public" | "private" = "public";
  try {
    const { data: pat } = await supabase
      .from("patients")
      .select("medical_aid")
      .eq("patient_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pat?.medical_aid && String(pat.medical_aid).trim() !== "") coverage = "private";
  } catch {
    // default public
  }

  const { data: incident, error } = await supabase
    .from("holarchelp_incidents" as any)
    .insert({
      user_id: user.id,
      status: "open",
      coverage,
      severity: "critical",
      activation_method: activationMethod,
      device_id: options.deviceId ?? null,
      triggered_by_role: "patient",
      triggered_by_user_id: user.id,
    } as any)
    .select("id, tracking_token")
    .single();

  if (error || !incident) {
    return {
      success: false,
      error: error?.message ?? "Failed to create incident",
      locationCaptured: false,
    };
  }

  const incidentId = (incident as any).id as string;
  const trackingToken = (incident as any).tracking_token as string;

  if (pos) {
    await supabase.from("holarchelp_locations" as any).insert({
      incident_id: incidentId,
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    });
  }

  // Fire-and-forget — dispatch matching and contact notification proceed
  // independently of whether the caller is still around to await them
  // (important for a native trigger that may background the app immediately).
  supabase.functions
    .invoke("dispatch-sos", { body: { incident_id: incidentId } })
    .catch((e) => console.warn("dispatch-sos failed", e));
  supabase.functions
    .invoke("share-incident-with-contacts", {
      body: { incident_id: incidentId, tracking_token: trackingToken },
    })
    .catch((e) => console.warn("share-incident-with-contacts failed", e));

  return {
    success: true,
    incidentId,
    trackingToken,
    locationCaptured: !!pos,
  };
}

/** Current SOS status for the logged-in user — used by native getEmergencyStatus() and the readiness screen. */
export async function getEmergencyStatus(): Promise<{
  active: boolean;
  incidentId?: string;
  activationMethod?: string;
  activatedAt?: string;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { active: false };

  const { data } = await supabase
    .from("holarchelp_incidents" as any)
    .select("id, activation_method, created_at")
    .eq("user_id", user.id)
    .in("status", ACTIVE_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = data as any;
  return {
    active: !!row?.id,
    incidentId: row?.id,
    activationMethod: row?.activation_method,
    activatedAt: row?.created_at,
  };
}

/** Cancels an active SOS — no PIN/auth challenge beyond the existing session, per the "radically simpler" emergency UX requirement. */
export async function cancelEmergencySOS(
  incidentId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("holarchelp_incidents" as any)
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() } as any)
    .eq("id", incidentId);

  return { success: !error, error: error?.message };
}
