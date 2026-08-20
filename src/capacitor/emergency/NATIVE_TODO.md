# Holarc Emergency Plugin — Native Implementation TODO

`HolarcEmergencyPlugin.ts` in this folder defines the plugin interface and a
working **web fallback** that calls the same `emergencyService.ts` used by
the in-app SOS button. That fallback is real and functional today — SOS
triggered through this plugin from web/PWA context works end-to-end. What
follows is genuinely missing and requires native Swift/Kotlin code; nothing
below is faked or simulated in JavaScript.

## Prerequisite (not done)

Capacitor's JS core (`@capacitor/core`) is installed so this interface
compiles, but the project has **no native iOS/Android projects yet**. Before
any native code below can run on a device:

```bash
npm install @capacitor/cli
npx cap init
npx cap add ios
npx cap add android
```

## iOS — App Intents / Siri Shortcuts

**Goal:** `"Hey Siri, Holarc SOS"` invokes the emergency action directly,
without opening the Holarc UI first, even from the lock screen.

**Not buildable from this repo today.** Requires:
1. An **App Intent** (iOS 16+, `AppIntent` protocol) defined in a native
   Swift target, e.g. `TriggerHolarcSOSIntent`, exposed via
   `AppShortcutsProvider` so it's discoverable by Siri/Shortcuts without any
   per-user setup.
2. The intent's `perform()` calls into the same native plugin implementation
   that backs `HolarcEmergencyPlugin.triggerSOS()` — i.e. write a native
   Swift class implementing this plugin's methods (using Capacitor's
   `CAPPlugin`/`CAPPluginMethod` for the in-app bridge, called directly by
   the App Intent for the lock-screen/background path — the intent must NOT
   route through the Capacitor JS bridge, since that requires the app/webview
   to be running).
3. That native code makes the same HTTP calls this file's web fallback makes
   (insert into `holarchelp_incidents`, invoke `dispatch-sos` and
   `share-incident-with-contacts` edge functions) OR calls a dedicated
   lightweight REST endpoint if a full Supabase JS client is too heavy for
   the intent extension's memory/time budget.
4. Location: `CLLocationManager` with `requestLocation()` — must handle "Only
   While Using" vs "Always" permission tiers; if the app has never been
   opened/foregrounded, `Always` permission won't yet be granted, and the
   intent must gracefully proceed with `location_status = unavailable`.
5. Background execution budget for App Intents run from Siri/lock screen is
   short (a few seconds) — the native implementation must fire the network
   requests and return quickly, not wait for full dispatch matching to
   complete.

**Explicitly not possible:** bypassing Face ID/passcode lock screen itself —
App Intents are an Apple-provided mechanism specifically designed to allow
this class of action without unlocking; Holarc code cannot and does not
attempt to circumvent the lock screen independently.

## iOS — Action Button (iPhone 15 Pro+)

Configured entirely through iOS Settings → Action Button → Shortcut, pointing
at the same App Intent/Shortcut built above. No additional Holarc-side code
beyond having the Shortcut available (§ above). Expose a "Set up Action
Button" instructional link in Emergency Settings once the Shortcut exists.

## iOS — Apple Watch (future)

Requires a companion watchOS app/complication with its own trigger UI,
calling the same backend via `WatchConnectivity` → paired iPhone → this
plugin, or a direct network call from the watch if cellular/Wi-Fi is
available independently. Not started.

## Android — App Actions / Google Assistant

**Goal:** `"Hey Google, Holarc SOS"` invokes the emergency action.

**Not buildable from this repo today.** Requires:
1. A **shortcuts.xml** capability definition (Android App Actions,
   `actions.intent.START_EXERCISE`-style custom capability, or a Google
   Assistant App Action) registered in the native Android project's
   manifest, mapping a voice phrase to an intent handled by a native
   Kotlin `BroadcastReceiver` or `Activity` with
   `android:launchMode="singleInstance"` and no visible UI.
2. That receiver calls the same native Kotlin plugin implementation backing
   `HolarcEmergencyPlugin.triggerSOS()`.
3. Android runtime permissions (`ACCESS_FINE_LOCATION`,
   `ACCESS_BACKGROUND_LOCATION` if triggering while the app is fully
   backgrounded) must be requested ahead of time via the normal in-app flow
   — a voice trigger cannot itself prompt for a dangerous permission the
   user hasn't already granted; if missing, proceed with
   `location_status = unavailable`, matching the iOS behavior.
4. Doze mode / battery optimization exemptions may be needed for reliable
   background execution — request via
   `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`, explained to the user in
   Emergency Settings, not silently.

## Android — Hardware button / gesture

No standard OS-level equivalent to iOS's Action Button across all Android
devices; OEM-specific (e.g. Samsung's Bixby key remapping, Google Pixel's
"repeatedly press power button" emergency SOS which is OS-native and out of
Holarc's control entirely). Where a manufacturer exposes a programmable
hardware key, wire it the same way as the Assistant App Action above. Not
started — device-specific, lower priority than voice.

## Android — Wear OS (future)

Same shape as Apple Watch: companion Wear OS app/tile, `WatchConnectivity`
equivalent (`Wearable Data Layer API`) → paired phone → this plugin, or
direct network if the watch has independent connectivity. Not started.

## What IS done and requires no further native work

- `emergencyService.ts` — the actual trigger/status/cancel logic, callable
  from any JS context today.
- `HolarcEmergencyPlugin.ts` web fallback — fully functional for
  browser/PWA-triggered SOS.
- `activation_method`/`device_id`/`cancelled_at` columns on
  `holarchelp_incidents` — ready to receive values from any of the above
  once they exist.
- Idempotency (duplicate-trigger collapsing within 15s) — works regardless
  of which activation method calls `triggerEmergencySOS()`.
