

# Plan: Show Dr Allie's new sessions on Shannon's profile + Fill invoice template fields

Two real bugs, both confirmed against the DB.

## 1. New sessions don't appear on the patient profile

**Root cause confirmed.** Both of Dr Allie's 4/23 sessions for Shannon Kennedy exist in the DB with `status='completed'` and proper transcripts. They're NOT being filtered out. They're not appearing because **`useSessions(id)` only fetches once on mount** and there's no realtime subscription or refetch trigger:

```ts
useEffect(() => { fetchSessions(); }, [patientId]);   // runs once per patient
```

When a doctor records a session from Shannon's profile, the recording flow uses a *different* React component that calls `useSessions()` (no patientId) — so its `completeSession()` updates a local `sessions` array in *that* component's hook instance. The profile page's hook instance never hears about the new row. Hard refresh works because the mount fetch re-runs.

**Fix.** In `src/hooks/useSessions.ts` `useSessions(patientId)`:

1. Add a Supabase realtime subscription on the `sessions` table filtered to the relevant rows. When `patientId` is set, listen for `INSERT`/`UPDATE`/`DELETE` events with `filter: 'patient_id=eq.<patientId>'`; when no `patientId`, filter by `user_id=eq.<currentUser>`. On any change → call `fetchSessions()` (debounced trivially by React state).
2. Also re-`fetchSessions()` when the tab regains focus (`window.addEventListener('focus', …)`) — handles the case where the user records elsewhere then comes back to the tab.
3. Keep the existing local `setSessions` updates inside `createSession`/`completeSession`/`updateSession` for the recording flow's own immediacy.

Cleanup the subscription + focus listener on unmount.

This also fixes the symmetrical case where Round Table notes update or another tab adds a session.

## 2. Invoice (and other auto-generated documents) preview shows raw `[…]` placeholders

**Root cause confirmed.** Pulled the latest auto-created invoice doc from the DB — its stored `content` literally contains `[DoctorNumber]`, `[InvoiceNumber]`, `[InvoiceDate]`, `[PatientAddress]`, `[MedicalAid]`, `[MedicalAidNumber]`, `[Services]`, `[TotalAmount]`, `[BankDetails]`, `[DueDate]`. The auto-fill replacement map in `useSessions.ts` (line 700–708) only includes `ClientName`, `PatientName`, `Date`, `SessionDate`, `DoctorName`, `PracticeNumber`, `PracticeAddress` — so every other placeholder survives unreplaced and shows up bare in the preview.

The same gap exists, to a lesser extent, in the prescription, medical-certificate, referral, and admission auto-fill blocks.

**Fix.** Beef up the replacement maps in `useSessions.ts` so they cover every common token the project's six default templates ship with. Also pull the additional patient fields (address, medical_aid, medical_aid_number, id_passport_number) and profile fields (`doctor_number`, `practice_address`) that are already in the DB.

### Invoice block (lines 680–755) — biggest impact

Extend the patient & profile selects:

```ts
supabase.from('patients')
  .select('name, physical_address, address, medical_aid, medical_aid_number, id_passport_number')
  .eq('id', patientId).maybeSingle(),
supabase.from('profiles')
  .select('full_name, practice_number, doctor_number, practice_address, default_currency, bank_details')
  .eq('id', user.id).maybeSingle(),
```

(`bank_details` / `default_currency` may not exist on `profiles` — guard with `as any` and `?? ''`.)

Generate a real invoice number once: `INV-YYYYMM-XXXXX` (mirror `InvoiceEditor.generateInvoiceNumber`). Build a default `Services` line using `summaryData?.invoice?.line_items` if present, otherwise a single "Consultation - <today>" row. Compute `TotalAmount` from those line items, fall back to `summaryData?.invoice?.total` or "[To be completed]" when no value is given.

Replacement map becomes:

```ts
const todayLong = new Date(today).toLocaleDateString();
const replacements: Record<string, string> = {
  ClientName: patientName, PatientName: patientName, 'Patient Name': patientName,
  Date: todayLong, SessionDate: todayLong, InvoiceDate: todayLong,
  DueDate: dueDateLong,
  DoctorName: docProfile?.full_name || '',
  DoctorNumber: docProfile?.doctor_number || '',
  RegistrationNumber: docProfile?.doctor_number || '',
  PracticeNumber: docProfile?.practice_number || '',
  PracticeAddress: docProfile?.practice_address || '',
  PatientAddress: patientRecord?.physical_address || patientRecord?.address || '',
  MedicalAid: patientRecord?.medical_aid || '',
  MedicalAidNumber: patientRecord?.medical_aid_number || '',
  Services: servicesLine,           // multi-line; preserves newlines
  TotalAmount: formattedTotal,      // e.g. "R 0.00" (uses default_currency or ZAR)
  BankDetails: (docProfile as any)?.bank_details || '',
  InvoiceNumber: generatedInvoiceNumber,
};
```

Apply with the existing regex loop. Also write the same `invoice_number` and `total` into a real `invoices` row (currently only the `documents` row is created), so the auto-generated invoice is queryable from the Invoices admin page too.

### Prescription / Medical Cert / Referral / Admission blocks

Add the missing common tokens that templates typically use. Minimal additions to each existing map:

- All four blocks: add `DoctorNumber` (alias of `RegistrationNumber`), `PracticeAddress`, `PatientAddress`, `MedicalAid`, `MedicalAidNumber`, `IDNumber`, `DOB`, `Phone`, `Email`. Pull the matching extra columns in each `supabase.from('patients').select(...)` call.
- Prescription: `Allergies`, `Repeats`, `Pharmacy` (from `patients.pharmacy_name`).
- Medical Cert: `FromDate`, `ToDate`, `Reason`, `Diagnosis` (already there); add `IssuedDate`, `Days` (computed from from/to).
- Referral: add `ReferringDoctor` (= DoctorName), `Specialty` (`profile.specialty`).
- Admission: already covers most; add `PracticeAddress`, `PatientAddress`, `MedicalAid`, `MedicalAidNumber`.

This is a one-pass extension of each replacement-map literal — no structural change.

### Generic fallback for any unmatched placeholder

After the replacement loop, run one final pass:

```ts
content = content.replace(/\[[A-Za-z][A-Za-z0-9_ -]*\]/g, '___');
```

So if a doctor invents a new template token we don't know about, it shows a fillable underscore line in the preview rather than the literal `[Foo]` syntax. Apply this in all five blocks.

### Effect on existing rows

The two stale invoice docs already in the DB will keep showing the placeholders — those were generated before the fix. We can either (a) leave them (the user already sees the fresh invoices going forward) or (b) add a one-time SQL migration that deletes auto-draft invoice/prescription docs created in the last 24h with `is_draft=true` so the user can re-run a session if they want clean ones. Recommend **(a)** — non-destructive — and surface a small toast when the user opens an old broken doc: "Older draft — re-create from session for filled values." (Actually, simplest: just leave them. Going forward all new ones are correct.)

## Files touched

| File | Change |
|---|---|
| `src/hooks/useSessions.ts` | Add realtime subscription + `focus` refetch in `useSessions(patientId)`. Extend invoice/prescription/cert/referral/admission replacement maps + their patient/profile selects + the generic `[Token]` → `___` fallback. Insert a real `invoices` row in the invoice block. |

## Out of scope

- Backfilling old auto-generated documents that already have placeholders (leave the historical drafts alone).
- Touching `summarize-session` edge function (the placeholders bug is on the *consumer* side, not the AI side — the AI doesn't put `[Token]` strings in; the template the user designed does).
- Realtime for `documents`/`todos` on the profile page (separate request if the user reports those going stale).
- Reworking how invoice line items are entered manually in `InvoiceEditor` — unchanged.

