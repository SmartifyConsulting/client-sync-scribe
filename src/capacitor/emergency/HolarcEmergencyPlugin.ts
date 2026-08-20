/**
 * Holarc Emergency Plugin — Capacitor native abstraction.
 *
 * ⚠️ CAPACITOR IS NOT YET INSTALLED IN THIS PROJECT (confirmed: no
 * @capacitor/* packages, no capacitor.config, no ios/ or android/
 * directories as of this build). This file defines the plugin INTERFACE
 * and ships a web-only implementation that calls the same
 * triggerEmergencySOS()/getEmergencyStatus() service used by the in-app
 * SOS button — so the app behaves identically today, whether SOS was
 * pressed in-app or (once native code exists) invoked from outside it.
 *
 * What this file does NOT and CANNOT do on its own:
 *   - Listen for "Hey Siri, Holarc SOS" while the phone is locked
 *   - Bypass iOS or Android lock-screen security
 *   - Run in the background after the app is killed
 *   - Respond to a hardware Action Button press
 * Those require real native code (Swift/Kotlin) registered as a Capacitor
 * plugin implementing this same interface. See NATIVE_TODO.md alongside
 * this file for exactly what remains to be built and where.
 */

import { registerPlugin } from "@capacitor/core";
import {
  triggerEmergencySOS,
  getEmergencyStatus,
  type ActivationMethod,
} from "../../modules/holarchelp/services/emergencyService";

export interface HolarcEmergencyTriggerOptions {
  /** How the SOS was invoked. Defaults to "hardware" for calls arriving through this native bridge — pass "in_app" explicitly for the in-app button instead. */
  activationMethod?: ActivationMethod;
  deviceId?: string;
}

export interface HolarcEmergencyTriggerResult {
  success: boolean;
  eventId?: string;
  locationCaptured?: boolean;
  error?: string;
}

export interface HolarcEmergencyStatusResult {
  active: boolean;
  eventId?: string;
}

export interface HolarcEmergencyPlugin {
  /** Creates an SOS event via the central Emergency Engine, regardless of caller. */
  triggerSOS(options?: HolarcEmergencyTriggerOptions): Promise<HolarcEmergencyTriggerResult>;
  /** Current SOS status for the logged-in user. */
  getEmergencyStatus(): Promise<HolarcEmergencyStatusResult>;
}

/**
 * Web fallback implementation — used automatically by registerPlugin() on
 * any platform without a native implementation registered (i.e. every
 * platform today, since Capacitor isn't installed/built for iOS/Android
 * yet). This makes the plugin interface fully usable from web/PWA context
 * right now, and gives native code something concrete to replace later
 * without changing any calling code elsewhere in the app.
 */
const webFallback: HolarcEmergencyPlugin = {
  async triggerSOS(options) {
    const result = await triggerEmergencySOS({
      activationMethod: options?.activationMethod ?? "hardware",
      deviceId: options?.deviceId,
    });
    return {
      success: result.success,
      eventId: result.incidentId,
      locationCaptured: result.locationCaptured,
      error: result.error,
    };
  },
  async getEmergencyStatus() {
    const status = await getEmergencyStatus();
    return { active: status.active, eventId: status.incidentId };
  },
};

/**
 * registerPlugin() will use a native implementation (once one exists and
 * Capacitor is installed/built) on iOS/Android, and falls back to
 * `webFallback` everywhere else — including today, before Capacitor exists
 * at all, since @capacitor/core itself has a no-op web-only mode.
 */
export const HolarcEmergency = registerPlugin<HolarcEmergencyPlugin>("HolarcEmergency", {
  web: () => webFallback,
});
