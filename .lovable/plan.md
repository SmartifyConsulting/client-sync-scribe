

# Redesign Patient Dashboard

## Overview
Redesign the patient dashboard to be more informative and appealing. Remove Invoices, Prescriptions, and Appointments stat cards. Add AI-powered patient summary, medications view, doctors with last/next visit dates, pharmacies, recent claims, and reward tips.

## Layout (top to bottom)

1. **Welcome Header** — keep as-is (name, notifications, avatar)
2. **Chronic Medication Badge** — keep as-is
3. **Row 1: Moolas Hero + AI Health Summary** (2-column)
   - Left: Moolas balance card (keep)
   - Right: AI-generated health summary card using existing `summarize-patient-history` edge function, showing a brief paragraph about the patient's health status
4. **Row 2: My Medications** (full-width card)
   - Show active medications in normal text, past/inactive medications greyed out
   - Fetch from `prescriptions` table — active vs expired/discontinued
5. **Row 3: Two-column grid**
   - **Left: My Healthcare Providers** — enhanced doctor table with "Last Seen" (from `sessions`) and "Next Appointment" (from `appointments`) columns
   - **Right: My Pharmacies** — list from patient record's `pharmacies` JSON field, highlight primary pharmacy with a badge
6. **Row 4: Two-column grid**
   - **Left: Recent Claims** — fetch recent invoices with `status = 'submitted'` or similar, show amount and date submitted so user can track reimbursements
   - **Right: Earn More Moolas** — tips card with actionable reward-earning strategies (log medication, complete tasks, health photos, visit streaks)
7. **Assigned Tasks** — keep as-is
8. **Quick Actions** — keep Calendar and Documentation links, remove Invoices link

## Sections Removed
- Appointments stat card
- Prescriptions stat card
- Invoices stat card
- Invoices quick action link

## Data Sources
- AI Summary: call `summarize-patient-history` edge function (already exists), cache in React Query
- Medications: `prescriptions` table filtered by patient_id
- Doctors + last/next visit: existing `doctor_patient_access` + `sessions` (last completed) + `appointments` (next upcoming)
- Pharmacies: `patients.pharmacies` JSON field from patient record
- Claims: `invoices` table where email_sent_at is not null (indicates submitted to insurance)
- Reward tips: static content with links

## Files Modified

| File | Change |
|------|--------|
| `src/pages/patient/PatientDashboard.tsx` | Complete redesign — remove stat cards, add new sections |

No database changes needed — all data sources already exist.

