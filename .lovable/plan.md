

# Redesign ProfileBanner to Match Attached Layout (Mobile)

## What Changes

The current banner has avatar + greeting/email on the same row with Calendar/Record Task buttons cramped to the right. The design shows a cleaner vertical stack layout:

1. **Row 1**: Avatar (left) + "Welcome back, Name" + email (right of avatar) — no buttons on this row
2. **Row 2**: Calendar icon + "Upcoming Appointments" heading + appointment list (or "No upcoming appointments.")
3. **Row 3**: Vula Vouchers logo/branding (left) + "You have earned / 1,523" counter (right) — separated by a vertical divider
4. **Row 4**: Calendar button (outline) + Record Task button (filled) — full width, side by side at the bottom

## File: `src/components/patients/PatientDetailsEditor.tsx`

### ProfileBanner restructure (lines 1044-1158)

Replace the current layout with:

```
┌──────────────────────────────────────────┐
│ (Avatar)  Welcome back,                 │
│           Georgia                        │
│           georgia.adams@holarc.health    │
├──────────────────────────────────────────┤
│ 📅 Upcoming Appointments                │
│    No upcoming appointments.             │
│    (or list of appointments)             │
├──────────────────────────────────────────┤
│  VULA        │  You have                │
│  VOUCHERS    │  earned                  │
│  (logo)      │  1,523                   │
├──────────────────────────────────────────┤
│  [Calendar]     [Record Task]            │
└──────────────────────────────────────────┘
```

**On mobile only** (`isMobile`):
- Move Calendar + Record Task buttons from the greeting row to a dedicated bottom row with equal-width buttons
- Show the Vula section as a two-column layout with divider: Vula branding left, counter right
- Show "Upcoming Appointments" as its own section with the calendar icon, always visible (show "No upcoming appointments." when empty)

**On desktop/tablet**: Keep current compact layout (or apply same redesign — the design is clean enough for all views)

### Specific changes:
1. Remove Calendar/Record Task buttons from the greeting row (line 1086-1109)
2. Make the "Upcoming Appointments" section always visible (remove the `length > 0` conditional on line 1126), show "No upcoming appointments." when empty
3. Restructure the Vulas section into a two-column layout with "VULA VOUCHERS" branding on the left and the counter on the right, separated by a border
4. Add a new bottom row with Calendar + Record Task buttons spanning full width

| File | Changes |
|------|---------|
| `src/components/patients/PatientDetailsEditor.tsx` | Restructure ProfileBanner layout to match design mockup |

