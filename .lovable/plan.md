

# Plan: Calendar Modal Fix, Vula Logo Alignment, Patients Page Buttons, Session Grouping

## 1. Fix Calendar Appointment Modal
**File:** `src/pages/CalendarView.tsx`

### Week view entries: show time + patient initials in small font
- Lines 482-488: Update week view day events to show patient initials alongside time (matching month view style), using `text-[10px]` font
- Look up patient name from `patients` list using `event.patientId`, compute initials

### Modal: solid background + patient name
- Line 713: Add `className="bg-card"` to `DialogContent` to remove transparency
- Lines 806-835: Add a patient name row (with User icon) between the time and date rows, looking up `patients.find(p => p.id === selectedEvent.patientId)?.name`

### "View Patient" → patient profile
- Already correct at line 851: navigates to `/patients/${selectedEvent.patientId}`

### "Start Session" auto-selects patient
- Already navigates to `/sessions?patient=${selectedEvent.patientId}` (line 249 area)
- Verify `Sessions.tsx` reads `urlPatientId` and sets `selectedPatientId` — already wired up

---

## 2. Vula Vouchers Logo Alignment

### Tablet view: middle-align the Vula logo
**File:** `src/components/patients/PatientDetailsEditor.tsx` (lines 1088-1096)
- The `hidden md:flex` Vula section on web/tablet: change from `items-center gap-3` to `items-center justify-center gap-3` to center-align the logo

### Mobile view: right-align the Vula logo + add greeting
**File:** `src/components/patients/PatientDetailsEditor.tsx` (lines 1137-1152)
- Change the mobile Vula row layout: right-align the logo within the flex container
- Add the patient's first-name greeting text to the left of the Vula display

---

## 3. Add "Round Tables" and "All Sessions" Buttons to Patients Page
**File:** `src/pages/Patients.tsx` (lines 397-417)

Currently has: Round Tables (mobile only via `lg:hidden`), Import, + Patient

Changes:
- Remove `lg:hidden` from Round Tables button so it shows on all layouts
- Add an "All Sessions" button that navigates to `/sessions`, visible on all layouts
- Ensure all buttons use responsive sizing: `text-[10px] md:text-xs` and `h-8 md:h-9` to fit properly across mobile/tablet/desktop

---

## 4. Session Grouping (already implemented — verify)
**File:** `src/pages/Sessions.tsx` (lines 1378-1402)

Session grouping into This Week / Last Week / Monthly buckets with Accordion is already implemented from the previous approved plan. No additional changes needed.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/CalendarView.tsx` | Week view initials, solid modal bg, patient name row |
| `src/components/patients/PatientDetailsEditor.tsx` | Tablet Vula center-align, mobile Vula right-align + greeting |
| `src/pages/Patients.tsx` | Add "All Sessions" button, show "Round Tables" on all views, responsive sizing |

