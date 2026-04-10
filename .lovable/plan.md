# Navigation Grouping, Section Header Styling & Mobile Compactness

## Summary

Group tabs into "My Profile" and "My Admin" parent tabs on web/tablet. Rename "Health" to "Profile" on mobile. Update section header colors. Make calendar and documents mobile-compact.

## Changes

### 1. Section Header Background — `#F5F4F1` with black text

**File:** `src/components/patients/PatientDetailsEditor.tsx`

- In `SectionHeader` component (line ~74): change `bg-primary` to `bg-[#F5F4F1]`, change `text-white` to `text-foreground` (black), change chevron from `text-white` to `text-foreground`

### 2. Web/Tablet: Group tabs into "My Profile" and "My Admin"

**File:** `src/components/patients/PatientDetailsEditor.tsx`

- In `renderTabsList()`, on non-mobile (desktop/iPad), replace flat tabs with grouped parent tabs:
  - **My Profile** parent tab → sub-tabs: Personal Information, Medical Information, NOK & ICE
  - **My Admin** parent tab → sub-tabs: My Calendar, My Tasks, My Documents
  - Other tabs (Dashboard, My H/Care Panel, My Sessions, My Round Table) remain as flat top-level tabs
- Implementation: Use a two-tier approach — top-level tabs include "My Profile" and "My Admin" as values. When selected, show a secondary sub-tab row below. The `activeTab` state will track the actual content tab (personal, medical, etc.), while a separate state tracks which parent group is active
- On mobile, keep the existing section-filtered flat tab behavior unchanged

### 3. Mobile: Rename "Health" to "Profile"

**File:** `src/components/layout/BottomNav.tsx`

- Change `{ icon: HeartPulse, label: "Health", section: "health" }` to `{ icon: HeartPulse, label: "Profile", section: "health" }`
- The `section` key stays `"health"` so the SECTION_TABS mapping still works

### 4. Mobile Calendar — compact layout

**File:** `src/pages/patient/PatientCalendar.tsx`

- Header area (lines 348-367): Stack the title, view toggle, and "Book Appointment" button vertically on mobile. Use `flex-col` on small screens:
  - Title row: remove back arrow (not needed inside tab), shrink heading to `text-lg`
  - View toggle + Book button: wrap into a row with `w-full` buttons on mobile, use smaller `size="sm"`
- Month grid (line 263): reduce `gap-1` to `gap-0`, reduce cell padding
- `AppointmentCard`: reduce padding from `p-4` to `p-2` on mobile, shrink icon from `h-10 w-10` to `h-8 w-8`
- Upcoming sidebar card: hide on mobile (`hidden lg:block`) since it duplicates the day view
- Week view buttons (line 212-214): use icon-only on mobile or abbreviate to `<` and `>`

### 5. Mobile Documents — compact layout

**File:** `src/pages/patient/PatientDocuments.tsx`

- Review the top section (heading, upload area, filters) and ensure they stack vertically and fit within 390px
- Reduce any large padding or fixed-width elements
- Make the upload button and filter controls full-width on mobile

### 6. General mobile compactness review

**File:** `src/components/patients/PatientDetailsEditor.tsx`

- Reduce outer card padding on mobile: change `p-4 md:p-6` to `p-2 md:p-6`
- Reduce `space-y-4` between sections to `space-y-2` on mobile using responsive classes
- Section content padding: reduce `p-3` to `p-2` on mobile inside `CollapsibleContent`
- Tab triggers: ensure text doesn't wrap oddly — already have `whitespace-nowrap` ✓

## Files Modified

| File                                               | Changes                                                                                                        |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `src/components/patients/PatientDetailsEditor.tsx` | Section header color to `#F5F4F1`/black; group tabs into My Profile/My Admin on desktop; reduce mobile padding |
| `src/components/layout/BottomNav.tsx`              | Rename "Health" label to "Profile"                                                                             |
| `src/pages/patient/PatientCalendar.tsx`            | Mobile-compact: stack header, shrink grid, hide sidebar on mobile                                              |
| `src/pages/patient/PatientDocuments.tsx`           | Mobile-compact: stack controls, reduce padding                                                                 |
