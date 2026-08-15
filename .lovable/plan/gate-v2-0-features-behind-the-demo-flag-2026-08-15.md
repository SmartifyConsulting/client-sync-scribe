# Gate v2.0 features behind the demo flag

Right now Biolog, Ask Angel and the Enneagram / relationship-profile features are visible to every user (Dean Allie included). Nothing in the codebase checks a v2 flag yet — the flag itself was never created.

## What changes

1. **Add a `v2_demo` flag on user profiles**, off by default. Only admins can change it. Turn it on for `georgia.adams@smartify.co.za` (both her doctor and patient identities use the same login) and leave everyone else off.

2. **Hide the v2 features when the flag is off:**
   - "My Biolog" and "Ask Angel" disappear from the sidebar and the mobile bottom navigation.
   - Direct visits to `/biolog`, `/ask-maeve` and `/ask-maeve/:id` redirect back to the dashboard.
   - On a patient profile, the Biolog tab, the "About Me" / relationship-profile survey, the Enneagram assessment details and the clinician relationship-insight card are not rendered.

3. **Admin toggle** — a "v2.0 demo" switch on the admin users screen so the flag can be turned on for any account without a code change.

## Technical notes

- Migration: `alter table public.profiles add column v2_demo boolean not null default false;` plus an admin-only update policy (`has_role(auth.uid(),'admin')`). Existing profile grants are unchanged.
- New `useV2Demo()` hook reading `profiles.v2_demo` for the signed-in user (React Query, cached). Gating is based on the **viewing** user's flag.
- Nav gating in `src/components/layout/Sidebar.tsx` (lines 87, 102, 116, 123, 132) and `src/components/layout/BottomNav.tsx` (lines 25, 33).
- Route gating in `src/App.tsx` (lines 229-231, 259-261) via a small `V2Route` wrapper that renders `<Navigate to="/" replace />` while the flag is off (and renders nothing until the flag loads, to avoid a flash).
- Patient-profile gating: Biolog tab in the patient tabs, plus `RelationshipProfileExercise`, `RelationshipAssessmentDetails` and `RelationshipInsightCard` call sites in `src/features/patients/components/PatientDetailsEditor.tsx`.
- Admin toggle added to the existing users admin table, writing `profiles.v2_demo`.
