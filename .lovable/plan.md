

# Updated Plan: 12 Changes

All previous 11 items remain unchanged. Adding:

### 12. Greeting shows first name for patients, surname for doctors

**File:** `src/components/patients/PatientDetailsEditor.tsx` (line 1081)

Currently: `${greeting}, ${patient.name}` — shows full name.
Fix: `${greeting}, ${patient.name.split(' ')[0]}` — extract and show only the first name.

**File:** `src/pages/Dashboard.tsx` (lines 232-243)

Already correct — doctors get `Dr. Surname`, non-doctors get first name. No change needed here.

---

## Full Change List

| # | Change | File(s) |
|---|--------|---------|
| 1 | Fix "Unknown Patient" in appointment requests | `AppointmentRequestsPanel.tsx` |
| 2 | Reduce Vula logos 20% (except My Rewards mobile) | `PatientDetailsEditor.tsx`, `DoctorRewards.tsx`, `StatsCard.tsx` |
| 3 | Increase Vula logos 50% on My Rewards mobile | `MyRewards.tsx` |
| 4 | Remove "View details" from Vula card on web | `Dashboard.tsx` |
| 5 | Remove circular clipping on mobile Vula logo | `StatsCard.tsx` |
| 6 | Fix tab order: skip "Forgot password" | `Auth.tsx` |
| 7 | Allow uninviting a doctor | `MyDoctors.tsx` |
| 8 | Fix patient profile pic on invitation cards | `InviteDoctorDialog.tsx`, `DoctorAccessRequests.tsx`, DB migration |
| 9 | Notifications for invite/accept/decline | `DoctorAccessRequests.tsx`, `Dashboard.tsx` |
| 10 | Round table from doctor home screen | `Dashboard.tsx` |
| 11 | Allow same-day appointment booking | `BookAppointmentDialog.tsx` |
| 12 | Patient greeting uses first name only | `PatientDetailsEditor.tsx` |

