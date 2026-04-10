

# Add "NOK & ICE" Tab + Mobile Tab Handling

## How it works

When a user is listed as a NOK or ICE contact on **another person's** patient profile (matched by email), those people appear in this tab. This lets the user know they're a designated contact.

## Mobile tab strategy

With 8+ tabs, the current `flex-wrap` approach will stack tabs into 2-3 rows on mobile, which gets cramped. The solution: **replace `flex-wrap` with horizontal scroll on mobile**. This is the standard pattern used by apps like Google, Airbnb, and most mobile-first interfaces.

```text
Desktop (wide):  [Tab1] [Tab2] [Tab3] [Tab4] [Tab5] [Tab6] [Tab7] [Tab8]  ← wraps naturally

Mobile (narrow): ◀ [Tab1] [Tab2] [Tab3] [Tab4] ▸  ← horizontal scroll, swipeable
```

The tabs remain in a single scrollable row. The user swipes left/right to reveal more tabs. A subtle gradient fade on the right edge hints at more content.

## Plan

### 1. Create `NokIcedTab` component

**New file:** `src/components/patients/NokIcedTab.tsx`

- On mount, get current user's email
- Query `patients` table for all records where `ice_contacts` or `next_of_kin_members` JSONB arrays contain an entry with a matching email and `shared: true`
- Display two sections: "Listed as Next of Kin for" and "Listed as ICE Contact for" showing the patient name, relationship, and phone
- Empty state if not listed anywhere

### 2. Add "NOK & ICE" tab after "My Round Table"

**File:** `src/components/patients/PatientDetailsEditor.tsx`

- Add `TabsTrigger value="nok-iced"` after the roundtable trigger (both view and edit mode, lines ~748-749 and ~1071-1072)
- Add `TabsContent value="nok-iced"` after roundtable content (both modes)
- Lazy-load the new component with `Suspense`

### 3. Make tabs horizontally scrollable on mobile

**File:** `src/components/patients/PatientDetailsEditor.tsx`

- Change both `TabsList` instances from `flex-wrap` to `overflow-x-auto flex-nowrap scrollbar-hide` on mobile
- Add a utility class `scrollbar-hide` in `index.css` (if not present) to hide the scrollbar while keeping swipe functional
- Add `whitespace-nowrap` to ensure tabs don't wrap

## Technical Summary

| File | Change |
|------|--------|
| `src/components/patients/NokIcedTab.tsx` | New component: queries patients where current user's email appears in ICE/NOK contacts |
| `src/components/patients/PatientDetailsEditor.tsx` | Add NOK & ICE tab trigger + content (both modes); change TabsList to horizontal scroll on mobile |
| `src/index.css` | Add `.scrollbar-hide` utility if missing |

No database migration needed — queries use existing JSONB columns with email matching.

