## Profile completion & self-heal — status across all roles

| Role | Banner shown when incomplete | Self-heal if record missing |
|------|------------------------------|-----------------------------|
| Patient | `MyDetails.tsx` → `ProfileCompletionBanner` | `MyDetails.fetchPatientRecord` auto-creates a minimal `patients` row |
| Doctor | `Dashboard.tsx` → `ProfileCompletionBanner` (specialty / practice_number / doctor_number / practice_address) | `useProfile.fetchProfile` auto-creates a `profiles` row on PGRST116 |
| Hospital | `ProviderDashboard.tsx` → `ProfileCompletionBanner` (registration_number / address / contact_phone / services) | Created by `register-emergency-provider` edge fn at signup; `ProviderGate` now offers a "Complete provider sign-up" CTA if the row is missing |
| Ambulance / Emergency Service Provider | `ProviderDashboard.tsx` → `ProfileCompletionBanner` (registration_number / base_address / contact_phone / fleet_size) | Same as hospital |

### Files touched in this pass
- `src/modules/holarchelp/components/ProviderGate.tsx` — friendlier "Not a provider yet" gate that links back to `/provider-signup` instead of a dead-end "Go home" only.

### Out of scope
- No DB schema or RLS changes.
- Hospitals/ambulance are intentionally not auto-created on first login (admin-onboarded model). The gate now recovers the "started signup, never finished" case by sending the user back to `ProviderSignup`.
