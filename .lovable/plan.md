

# Updated Plan: 13 Changes

All previous 12 items remain unchanged. Adding:

### 13. Group sessions by time period in All Sessions list

**File:** `src/pages/Sessions.tsx` (lines 1380-1468)

Currently the filtered sessions render as a flat list. Replace with grouped, collapsible sections using the existing Accordion component.

**Grouping logic:**
- **This Week** — sessions from Monday of the current week to today. Always expanded, not collapsible.
- **Last Week** — sessions from the previous Monday to Sunday. Collapsed by default.
- **Monthly groups** — all older sessions grouped by `format(date, 'MMMM yyyy')` (e.g. "March 2026"). Collapsed by default.

**Implementation:**
1. Import `startOfWeek`, `endOfWeek`, `subWeeks`, `isWithinInterval` from `date-fns` and the `Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent` components
2. After filtering, sort sessions descending by `started_at`, then partition into the three group types
3. Render "This Week" as a plain open section (no accordion, just a heading + session list)
4. Render "Last Week" and each month as `AccordionItem` entries (collapsed by default via `type="multiple"` with no default value)
5. Each group header shows the period label and session count badge
6. Session row markup stays identical

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
| 13 | Group sessions by week/month with collapsible sections | `Sessions.tsx` |

