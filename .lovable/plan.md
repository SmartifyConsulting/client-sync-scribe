# Invite headings alignment + orange role pills

## 1. Align the two headings in the doctor invitation card

In the patient invitation card, "What you will be able to access" sits above the two-column grid while "What other practitioners can access" sits inside the right column, so the two headings are on different lines.

Change: move both headings inside the grid so each column has its own heading on the same baseline.

```text
+-----------------------------+-----------------------------+
| What you will be able to    | What other practitioners    |
| access                      | can access                  |
+-----------------------------+-----------------------------+
| ✓ granted items             | ✓ shared with care team     |
| ✗ denied items              | ✗ private, not shared       |
+-----------------------------+-----------------------------+
```

Both headings use the same size, weight and bottom margin, with a fixed min-height so a two-line heading in one column does not push its list down relative to the other.

## 2. Orange Doctor / Patient pills in the nav menu

The role pills at the top of the account menu are currently light teal (doctor) and plain text (patient) — the earlier orange styling was reverted.

Change:
- Active role pill (whichever profile the user is currently in) uses the dark orange token (#B84B0A) background with white text and a white icon.
- The other role pill uses the darker grey pill background with dark text.
- Both render as rounded pills of equal height so they read as a pair.

The `dark-orange` and `pill-grey` tokens already exist in the design system, so no new colours are introduced.

## Technical notes

- `src/components/doctor/DoctorAccessRequests.tsx` — restructure the grant panel to a two-column grid with a heading per column.
- `src/components/layout/AccountMenu.tsx` — apply `bg-dark-orange text-white` to the active role pill and `bg-pill-grey` to the inactive one, for both the doctor branch and the non-doctor branch.
