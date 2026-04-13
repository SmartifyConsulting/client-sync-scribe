

# Mobile Dashboard Cleanup: Remove Cards & Relocate Quick Actions

## Summary
On mobile only, hide the AI Health Summary, Earn More Vulas, Recent Claims, and Documentation cards from the patient dashboard. Move the Calendar and Record Task buttons directly under the "Welcome back" greeting.

## Changes

### File: `src/pages/patient/PatientDashboard.tsx`

1. **Import `useIsMobile`** hook at the top
2. **Add `const isMobile = useIsMobile()`** in the component
3. **Restructure the Welcome Header (lines 288-312)**:
   - Keep the greeting on the left
   - On mobile: move Calendar + Record Task buttons below the greeting (as a new row under the welcome text), instead of to the right
   - On desktop: keep them on the right as-is
4. **Wrap the following sections with `{!isMobile && (...)}`**:
   - Row 1 AI Health Summary card (lines 343-365) — hide only the AI summary card, keep Upcoming Appointments
   - Row 2 "Earn More Vulas" card (lines 413-439) — hide only that card, keep Vulas Balance
   - Row 3 entire section (lines 442-496) — hide Recent Claims + Documentation cards

## Technical Detail

The welcome header will change from a single flex row to a stacked layout on mobile:
```
// Mobile: stack greeting + buttons vertically
<div>
  <div className="flex items-center gap-4">
    {/* icon + greeting */}
  </div>
  <div className="flex gap-2 mt-3">
    {/* Calendar + Record Task buttons */}
  </div>
</div>

// Desktop: keep side-by-side layout as-is
```

For the grid sections, the AI Health Summary and Earn More Vulas cards will be conditionally rendered, while their sibling cards (Upcoming Appointments, Vulas Balance) will expand to full width on mobile via conditional grid classes.

| File | Changes |
|------|---------|
| `src/pages/patient/PatientDashboard.tsx` | Add `useIsMobile`, hide 4 cards on mobile, move quick action buttons under greeting |

