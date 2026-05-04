# Full Rename: Guardian → HolarcHelp

Three coordinated changes shipped together so the app stays consistent.

## 1. Database migration (schema rename)

Rename every `guardian_*` object to `holarchelp_*`. RLS policies, foreign keys, and indexes follow the table rename automatically; functions are dropped and recreated with new names and bodies.

**Tables renamed (15):**
- `guardian_incidents` → `holarchelp_incidents`
- `guardian_locations` → `holarchelp_locations`
- `guardian_emergency_contacts` → `holarchelp_emergency_contacts`
- `guardian_hospitals` → `holarchelp_hospitals`
- `guardian_hospital_members` → `holarchelp_hospital_members`
- `guardian_ambulance_providers` → `holarchelp_ambulance_providers`
- `guardian_ambulance_members` → `holarchelp_ambulance_members`
- `guardian_incident_events` → `holarchelp_incident_events`
- `guardian_incident_offers` → `holarchelp_incident_offers`
- `guardian_incident_cancellations` → `holarchelp_incident_cancellations`
- `guardian_incident_feedback` → `holarchelp_incident_feedback`
- `guardian_messaging_log` → `holarchelp_messaging_log`
- `guardian_voice_clip_settings` → `holarchelp_voice_clip_settings`
- `guardian_provider_status` → `holarchelp_provider_status` (enum or table — kept as-is)
- `guardian_subscription_status` → `holarchelp_subscription_status`

**Column renamed:**
- `profiles.guardian_enabled` → `profiles.holarchelp_enabled`

**Functions dropped & recreated (4):**
- `guardian_get_tracking_incident` → `holarchelp_get_tracking_incident`
- `guardian_get_tracking_locations` → `holarchelp_get_tracking_locations`
- `guardian_user_enabled` → `holarchelp_user_enabled`
- `guardian_approve_hospital` → `holarchelp_approve_hospital`
- `guardian_approve_ambulance` → `holarchelp_approve_ambulance`

**Enums / app_modules:**
- `app_modules.module_key = 'guardian'` row updated to `'holarchelp'`
- Enum values `guardian_hospital_tier`, `guardian_ambulance_tier` left as type names but recreated as `holarchelp_hospital_tier`, `holarchelp_ambulance_tier`

**Storage bucket:**
- `guardian-voice-clips` bucket kept (renaming buckets requires object copy + RLS rewrite). A code constant maps the brand to the bucket id.

## 2. Code updates

Find/replace everything matching `guardian_*` (DB identifiers) and rewrite Supabase calls to use the new names. `src/integrations/supabase/types.ts` regenerates automatically after the migration.

**Files touched:**
- `src/modules/guardian/hooks/useGuardianAccess.ts` — `guardian_user_enabled` → `holarchelp_user_enabled`, `guardian_enabled` → `holarchelp_enabled`
- `src/modules/guardian/hooks/useLocationTracking.ts` — table refs
- `src/modules/guardian/lib/whatsapp.ts` — table refs
- `src/modules/guardian/pages/GuardianHome.tsx` — table refs + UI copy + internal links to `/patient/guardian/...`
- `src/modules/guardian/pages/GuardianContacts.tsx` — table refs + UI copy
- `src/modules/guardian/pages/GuardianIncidents.tsx` — table refs + UI copy + links
- `src/modules/guardian/pages/GuardianIncidentDetail.tsx` — table refs + UI copy + links
- `src/modules/guardian/pages/PublicTrack.tsx` — `guardian_get_tracking_*` RPCs renamed
- `src/modules/guardian/components/GuardianGate.tsx` — column ref
- `src/modules/guardian/routes.tsx` — catch-all `Navigate to="/guardian"` → `"/patient/guardian"`
- `src/modules/guardian/README.md` — describe rename
- `src/features/admin/pages/UserManagement.tsx` — column `holarchelp_enabled`, header label "HolarcHelp"
- `src/features/patients/components/PatientDetailsEditor.tsx` — column ref if any
- `src/App.tsx` — verify route mounts, brand label
- `src/components/layout/BottomNav.tsx` — label "HolarcHelp"
- `src/index.css` — any guardian-prefixed classnames renamed (cosmetic)
- `src/pages/PatientConsent.tsx`, `src/pages/TermsAndConditions.tsx` — replace word "Guardian" with "HolarcHelp" in copy

**Folder & symbol rename (internal codebase only):**
- `src/modules/guardian/` → `src/modules/holarchelp/`
- `useGuardianAccess` → `useHolarcHelpAccess`, `GuardianGate` → `HolarcHelpGate`, page components `GuardianHome` → `HolarcHelpHome` etc.
- Route segment kept as `/patient/guardian` for now (changing it breaks any saved links and the public tracking URLs already in the wild). A short note in README explains.

## 3. Route 404 fix (folded in)

While editing the page files, all internal `/guardian/...` links are repointed to `/patient/guardian/...` so the user-reported 404s disappear.

## Risk & rollback

- Migration is wrapped in a single transaction. If any step fails, nothing changes.
- Public tracking links (`/track/:token`) keep working — only the underlying RPC name changes.
- The `guardian-voice-clips` storage bucket is intentionally NOT renamed. A constant `HOLARCHELP_VOICE_BUCKET = 'guardian-voice-clips'` keeps existing audio reachable.
- Any external integrations querying `guardian_*` tables directly (none known) would need updating.

## Out of scope

- Renaming the storage bucket (would require copying every object).
- Renaming the URL segment `/patient/guardian` → `/patient/holarchelp` (would break saved tracking links).
- Building a dedicated provider/dispatcher portal (separate task).
