# Import Holarc Guardian as a Toggleable Module

Bring the entire **Holarc Guardian** project (SOS, live location, responders, admin) into this app as a self-contained module under `src/modules/guardian/`, gated behind a per-user subscription flag that admins (and eventually billing) can switch on/off.

## What gets imported from Holarc Guardian

**Frontend (24 pages, 11 components, 4 hooks, 4 lib files):**
- Pages: Home, Profile, Contacts, Incident(s), Discover, PublicTrack, IncidentFeedback, MessagingLog, ProviderDashboard / Queue / Incident, RegisterProvider, Admin, AdminIncident, AdminProviders, AdminVoiceClips, AdminAccountability, Unsubscribe, VerifyEmail (Auth/ResetPassword **skipped** — we already have those).
- Components: AppShell, LiveMap, ProvidersMap, IncidentStatusBanner, SeverityPicker, PhoneInput, AddressAutocomplete, Logo, NavLink, ProtectedRoute.
- Hooks: useLocationTracking, useProviderLocation.
- Lib: google-geocode, whatsapp, auth helpers (merged into existing auth).

**Backend (15 edge functions + 14 migrations):**
- Functions: `sos-dispatch`, `dispatch-broadcast`, `incident-accept/cancel/feedback/monitor/status`, `at-voice-callback`, `voice-clip-upload-url`, `process-email-queue`, `send-transactional-email`, `preview-transactional-email`, `handle-email-suppression`, `handle-email-unsubscribe`.
- New tables (all prefixed/namespaced under `guardian_` to avoid collision with existing `profiles`, `user_roles`, `notifications`): `guardian_emergency_contacts`, `guardian_incidents`, `guardian_locations`, `guardian_providers`, `guardian_provider_locations`, `guardian_dispatches`, `guardian_voice_clips`, `guardian_email_*` queue tables, etc.

## Module gating ("switch on/off")

A new boolean flag `guardian_enabled` per user controls visibility. Two layers:

1. **Per-user opt-in/subscription flag** — new column `profiles.guardian_enabled boolean default false`. Set by:
   - Admin (User Management page → toggle).
   - Eventually a self-serve subscription upgrade (PayPal / Stripe add-on, deferred — placeholder hook ready).
2. **Global kill switch** — `app_modules` config table with row `('guardian', enabled boolean)` so the whole module can be disabled across the org.

A single hook `useGuardianAccess()` returns `{ enabled, loading }` combining both. Used to:
- Hide/show the Guardian sidebar entry & bottom-nav item.
- Guard all `/guardian/*` routes (redirect to `/settings` with upsell if disabled).
- Skip-render Guardian widgets on dashboards.

## File layout in this project

```text
src/modules/guardian/
  index.ts                  // public exports + GuardianRoutes
  routes.tsx                // <Route path="guardian/*"> tree
  pages/                    // all 22 imported pages, paths re-prefixed
  components/               // LiveMap, ProvidersMap, etc.
  hooks/                    // useLocationTracking, useProviderLocation, useGuardianAccess
  lib/                      // google-geocode, whatsapp
  README.md
supabase/functions/guardian-*/   // all 15 functions, prefixed `guardian-`
supabase/migrations/<ts>_guardian_module.sql  // single consolidated migration
```

All Guardian internal links rewritten from `/home`, `/incidents`, `/admin/...` → `/guardian`, `/guardian/incidents`, `/guardian/admin/...`.

## Routing changes

In `src/App.tsx`, mount the module lazily:

```tsx
const GuardianRoutes = lazy(() => import("@/modules/guardian/routes"));
...
<Route path="/guardian/*" element={
  <ProtectedRoute><GuardianGate><GuardianRoutes /></GuardianGate></ProtectedRoute>
} />
<Route path="/track/:token" element={<PublicTrack />} />  // public, ungated
```

`GuardianGate` checks `useGuardianAccess()`; renders upsell page if disabled.

## Sidebar / nav integration

- Add a "Guardian SOS" entry to `Sidebar.tsx` and `BottomNav.tsx`, conditionally rendered when `useGuardianAccess().enabled`.
- Match existing teal/red Holarc styling (Guardian already uses the same shadcn tokens — verified in cross-project check).

## Admin toggle UI

In `src/pages/admin/UserManagement.tsx` add a "Guardian" column with a switch per user that updates `profiles.guardian_enabled`. Admin can also toggle the global `app_modules.guardian.enabled` from a new card on `/admin`.

## Database & secrets

**Migration** creates all `guardian_*` tables with RLS (mirrors original Guardian policies, swapping `app_role` checks to use existing `user_roles` table + `has_role(_, 'admin')`). Adds:
- `profiles.guardian_enabled boolean default false`
- `app_modules` table (admin-managed)

**Existing secrets reused:** RESEND_API_KEY, GOOGLE_MAPS_API_KEY, OPENAI_API_KEY, SUPABASE_*.
**New secrets needed:** Africa's Talking voice API creds (only if voice-callback feature is desired) — will request via `add_secret` only when user confirms voice features should be active. Otherwise the voice-clip + at-voice-callback functions ship disabled.

## Things explicitly NOT brought over

- Guardian's separate `Auth.tsx`, `ResetPassword.tsx`, `Index.tsx` — we already have ours; users sign in once, Guardian just becomes a module.
- Guardian's separate `profiles` / `user_roles` tables — merged into existing ones (Guardian's `medical_info`, `notes` columns added to existing profiles).
- Guardian's standalone QueryClient, Toaster, Tooltip providers — uses the host app's.

## Implementation steps (when approved)

1. Create migration: `guardian_*` tables + RLS + `profiles.guardian_enabled` + `app_modules`.
2. Copy 15 edge functions into `supabase/functions/guardian-*` (rewriting internal function-to-function calls to new names).
3. Copy frontend files into `src/modules/guardian/`, rewrite imports & internal route paths.
4. Add `useGuardianAccess` hook + `GuardianGate` wrapper.
5. Mount lazy routes in `App.tsx`; add public `/track/:token`.
6. Add conditional nav entries in `Sidebar.tsx` + `BottomNav.tsx`.
7. Add admin toggle in `UserManagement.tsx` and global toggle on `/admin`.
8. Add upsell page shown when module is disabled.
9. Update `mem://index.md` with a new "Guardian module" memory file.

## Open questions before I build

1. **Who can self-enable Guardian?** Admin-only for now, or do you want a "Subscribe to Guardian" button for end-users immediately (PayPal add-on)?
2. **Voice clips / Africa's Talking callbacks** — include now (need API keys) or ship disabled?
3. **Patient vs Doctor visibility** — should Guardian appear for patients only, doctors only, or both when enabled?
