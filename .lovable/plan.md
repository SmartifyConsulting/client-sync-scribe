# SOS fixes (combined plan)

## 1. Pick hospital → "function not found"
`AvailableResponders.tsx` calls RPC `holarchelp_patient_pick_provider(_incident_id, _provider_id, _kind)` which doesn't exist. Only `holarchelp_accept_incident` exists (ambulance staff path).

**Migration** — create `holarchelp_patient_pick_provider(_incident_id uuid, _provider_id uuid, _kind text)` SECURITY DEFINER:
- Verify caller owns the incident (`user_id = auth.uid()`).
- Atomically lock: update only when `assigned_provider_id IS NULL` and status in (`open`,`reopened`); set `assigned_provider_id`, `status='assigned'`, `accepted_at=now()`.
- Upsert chosen offer to `accepted` (insert with `provider_kind=_kind` if missing).
- Mark other pending offers `superseded`.
- Insert `patient_picked` event with `{provider_id, kind}`.
- Raise on race so toast surfaces "Incident already taken".

## 2. Google Maps "This page can't load Google Maps correctly"
`src/modules/holarchelp/config/google-maps.ts` falls back to a hardcoded public key when `VITE_GOOGLE_MAPS_API_KEY` is missing. The existing `GOOGLE_MAPS_API_KEY` is a server-side secret — Vite can't read it.

**Fix:**
- Prompt user to add `VITE_GOOGLE_MAPS_API_KEY` secret (same value as `GOOGLE_MAPS_API_KEY`).
- Remove hardcoded fallback in `google-maps.ts`; warn loudly if missing.
- Ask user to confirm Google Cloud key HTTP-referrer restrictions include `*.lovable.app/*`, `*.lovableproject.com/*`, `holarchealth.com/*`, `medpad.lovable.app/*`.

## 3. Show auto-assigned provider name in incident history
Currently the incident history (e.g. `PatientIncidentHistory.tsx`, `HolarcHelpIncidents.tsx`, `HolarcHelpIncidentDetail.tsx`) shows status but doesn't display *which* hospital/ambulance was assigned.

**Fix:**
- After loading incidents with `assigned_provider_id`, fetch the matching name from either `holarchelp_ambulance_providers` (company_name) or `holarchelp_hospitals` (name) based on a `provider_kind` lookup (use the accepted offer's `provider_kind`).
- Add a helper `useAssignedProviderNames(incidents[])` that batches the two lookups by id.
- Render a line like "Assigned: Netcare Milpark Hospital (auto)" — the "(auto)" suffix appears when the most recent event for that incident is `auto_assigned` (vs `patient_picked` or `accepted`).
- Apply in: list view (`HolarcHelpIncidents.tsx`, `PatientIncidentHistory.tsx`) and detail view (`HolarcHelpIncidentDetail.tsx`).

## 4. Patient SOS shouldn't ask "for you or a patient?"
Currently the SOS trigger goes through `DoctorSosChooser.tsx` which prompts whether the SOS is for self or a patient. For users whose primary role is patient, this prompt should be skipped — fire SOS for self immediately.

**Fix:**
- In the SOS entry point (`HolarcHelpHome.tsx` / wherever the SOS button lives), branch on role: if user role is `patient` (not `doctor`), bypass `DoctorSosChooser` and go straight to the self-SOS flow.
- Keep `DoctorSosChooser` only for doctor-role users.

## Order of operations
1. Migration: create `holarchelp_patient_pick_provider`.
2. Patch frontend: skip `DoctorSosChooser` for patient role.
3. Patch frontend: render assigned provider name (+ auto badge) in history list and detail.
4. Add `VITE_GOOGLE_MAPS_API_KEY` secret + remove hardcoded fallback in `google-maps.ts`.
5. Ask user to verify Google Cloud key referrer restrictions.
