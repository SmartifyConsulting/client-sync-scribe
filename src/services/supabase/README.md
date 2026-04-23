# Supabase services

Typed query wrappers. One file per domain:

- `patients.ts`, `sessions.ts`, `documents.ts`, `invoices.ts`, `prescriptions.ts`,
  `profiles.ts`, `appointments.ts`, `rewards.ts`, `admissions.ts`

Each function returns plain data and throws on error. Hooks/components consume these — they never call `supabase.from(...)` directly after Phase 2.
