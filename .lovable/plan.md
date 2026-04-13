

# Doctor Mobile View: Compaction, Navigation, Search & Accordion Fixes

## Summary
Eight groups of changes: remove left sidebar menu on mobile, add avatar to mobile header, compact all mobile fonts and patient cards, center Import/Add buttons, add session search by patient/date, convert My Practice sections to collapsed accordions with edit/save/cancel, and replace all green Check save icons with floppy disk (Save) icons.

## Changes

### 1. Remove left sidebar menu, add avatar to mobile header
**File:** `src/components/layout/MobileHeader.tsx`
- Remove the hamburger menu Sheet+Sidebar entirely
- Add `TopBarIcons` (which includes avatar with popover) to the right side of the header
- Keep the Holarc logo on the left

### 2. Global mobile font compaction
**File:** `src/index.css`
- Add a mobile media query (`max-width: 767px`) that reduces base font size to ~14px
- Target common text classes: patient names (`text-sm` → `text-xs`), headings (`text-2xl` → `text-xl`), card labels

**File:** `src/pages/Patients.tsx`
- Reduce patient name font from `text-sm` to `text-xs` on mobile (lines 842, 927)
- Reduce table header padding and font sizes
- Reduce alphabet bar height
- Center the Import and Add New Patient buttons using `justify-center` on the button container (line 386)

### 3. Reduce Patient Profile stat cards by 60%
**File:** `src/pages/PatientProfile.tsx`
- Lines 277-326: Reduce card padding from `p-4` to `p-2`, stat value from `text-2xl` to `text-sm`, label from `text-xs` to `text-[10px]`, icon sizes from `h-4 w-4` to `h-3 w-3`
- Reduce Vulas logo from `h-6 w-6` to `h-4 w-4`

### 4. Add search/filter to All Sessions list
**File:** `src/pages/Sessions.tsx`
- Add a search input and date range filter above the "All Sessions" list (around line 1273)
- Search bar filters sessions by patient name (case-insensitive)
- Date range filter with From/To date pickers
- Filter the `sessions.filter(s => s.status !== 'in_progress')` results by these criteria

### 5. Convert My Practice tab content to collapsible accordions
**File:** `src/pages/MyPractice.tsx`
- Import `Accordion, AccordionItem, AccordionTrigger, AccordionContent` from `@/components/ui/accordion`
- Wrap each section (Personal Information, Practice Details, Document Mailbox, Practice Partners, Digital Signature, etc.) in an `AccordionItem`, defaulting to collapsed
- Add `Pencil` edit icon inline in each accordion header
- Add `Save` (floppy disk) and `X` (cancel) icons when editing

### 6. Replace all green Check save icons with floppy disk (Save) icons
**Files:** Multiple files where `<Check>` is used as a save action icon:
- `src/pages/MyPractice.tsx` — partner save (line 1328), saved status indicator (line 975)
- `src/pages/TodoList.tsx` — edit save (line 510)
- `src/components/patients/PatientDetailsEditor.tsx` — save icons in edit mode headers
- Replace `Check` with `Save` from lucide-react (floppy disk icon) in save-action contexts only (not status indicators like CheckCircle or copy-confirmation)

## Files Modified

| File | Changes |
|------|---------|
| `src/components/layout/MobileHeader.tsx` | Remove sidebar menu, add TopBarIcons with avatar |
| `src/pages/Patients.tsx` | Compact fonts, center buttons |
| `src/pages/PatientProfile.tsx` | Reduce stat cards by 60% |
| `src/pages/Sessions.tsx` | Add search by patient + date range filter |
| `src/pages/MyPractice.tsx` | Convert sections to collapsed accordions with edit/save/cancel icons, replace Check with Save icon |
| `src/pages/TodoList.tsx` | Replace Check save icon with Save (floppy disk) |
| `src/components/patients/PatientDetailsEditor.tsx` | Replace Check save icon with Save (floppy disk) |

