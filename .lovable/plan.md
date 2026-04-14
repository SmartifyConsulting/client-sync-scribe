

# Patient List UI Refinements + Admin Icon Change + Font Size Increases

## Summary
Nine changes: reorder green dot, hide "Since" on mobile, collapsible letter groups, rename button, Round Tables on mobile, tablet mirrors mobile, normalize fonts, change Admin icon, and increase email/nav label font sizes.

## Changes

### 1-7. (Unchanged from previous plan)
1. Green dot before chronic icon
2. Hide "Since" column on mobile
3. Letter-group accordion — collapsed by default
4. Rename "+ Add New Patient" to "+ Patient"
5. Add Round Tables button on mobile (left of Import)
6. Tablet view emulates mobile layout
7. Normalize font sizes to match card text density

### 8. Change Admin icon from Shield to UserCog
**File:** `src/components/layout/BottomNav.tsx`
- Replace `Shield` with `UserCog` from lucide-react

### 9. Increase email address and navigation label font sizes
**File:** `src/pages/PatientProfile.tsx`
- **Email under doctor name in header card** (line 236): change `text-sm` to `text-base` on the email/phone container so the email address is more legible
- **"Back to Patients" nav label** (line 218): change `text-sm` to `text-base` so the navigation link is easier to read
- Apply the same increase to any similar "Back to..." navigation labels across patient-related pages

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/Patients.tsx` | Changes 1-7: dot reorder, hide Since, letter accordions, rename button, Round Tables button, tablet=mobile, font normalization |
| `src/components/layout/BottomNav.tsx` | Change Admin icon from `Shield` to `UserCog` |
| `src/pages/PatientProfile.tsx` | Increase email font from `text-sm` to `text-base`, increase "Back to Patients" from `text-sm` to `text-base` |

