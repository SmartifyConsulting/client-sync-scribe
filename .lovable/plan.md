

# Multi-Feature Update Plan

## 1. Patient Initials Badge on Calendar Events

**File: `src/pages/CalendarView.tsx`**

In the calendar grid (lines 381-401), replace the plain time text with a small circular badge showing patient initials (derived from `patientId` → look up patient name from `patients` array). Wrap the badge in a `Tooltip` (from `@/components/ui/tooltip`) so hovering shows the full patient name. Show time alongside the badge. For events without a patient (internal meetings), show just the time as before.

Also apply to Today's Schedule sidebar (lines 419-451): add initials badge next to event title with tooltip.

## 2. Green Send Icon / Grey Sent Icon on Documents

**Database migration:** Add `email_sent_at` column (nullable `timestamptz`) to the `documents` table to track when a document was emailed.

**File: `src/pages/Documents.tsx`**
- Import `Send`, `SendHorizontal` (or `ArrowUpRight`) from lucide-react instead of `Mail`
- On each document row (line 637-645): if `doc.email_sent_at` is set, show a greyed-out send icon (`text-muted-foreground`); otherwise show a green send icon (`text-green-600`)
- After successful email send (line 296-302), update the document's `email_sent_at` in the DB and refresh local state

**File: `src/hooks/useDocuments.ts`**
- Add `email_sent_at` to `Document` interface

## 3. Sort Patients by Last Name, First Name in All Dropdowns

**File: `src/hooks/usePatients.ts`**

After fetching patients (line 178), sort the `patientsWithLastVisit` array by surname (last word of name) then first name before calling `setPatients`. This ensures all consumers (CalendarView patient select, DocumentEditor patient select, Invoices patient select, etc.) get alphabetically sorted patients automatically.

```typescript
patientsWithLastVisit.sort((a, b) => {
  const aLast = a.name.trim().split(/\s+/).pop()?.toLowerCase() || '';
  const bLast = b.name.trim().split(/\s+/).pop()?.toLowerCase() || '';
  if (aLast !== bLast) return aLast.localeCompare(bLast);
  return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
});
```

## 4. Procedure Field in Hospital Admission Form with AI Auto-Fill

**File: `src/components/sessions/HospitalAdmissionEditor.tsx`**

Between the Admission Details section and the ICD-10 codes section (around line 453), add a new "Procedure" text input field (`procedureDescription` state already exists but has no visible input in the form — it's only used in template replacement). Add a visible `<Input>` or `<Textarea>` for it. When the field value changes or on blur with 3+ characters, call the `lookup-medical-codes` edge function with `codeSystem: "procedure"` and `country` to fetch relevant procedure codes. Auto-populate the NHRPL code system entries with the returned codes.

The `procedureDescription` is already wired into `generateContent()` at line 347 (`[PROCEDURE_DESCRIPTION]`), so the main work is:
- Adding the visible Procedure input field in the form UI
- On procedure entry, trigger a code lookup and auto-fill NHRPL entries

## Files Modified

| File | Change |
|------|--------|
| `src/pages/CalendarView.tsx` | Patient initials badge with tooltip on calendar events |
| `src/pages/Documents.tsx` | Green send icon / grey sent icon based on `email_sent_at` |
| `src/hooks/useDocuments.ts` | Add `email_sent_at` to Document interface |
| `src/hooks/usePatients.ts` | Sort patients by Last Name, First Name |
| `src/components/sessions/HospitalAdmissionEditor.tsx` | Add Procedure input field with AI code auto-fill |
| **DB migration** | Add `email_sent_at timestamptz` column to `documents` table |

