

# Dashboard, Briefing, Admin & Practice Refinements

## Summary
Five changes: remove collapsible wrappers from To-Do and Round Tables on web/tablet, move narration segment label above play controls, remove doctor/patient Vula detail from dashboard card, remove Pricing tab from Admin (doctor view), add Pricing Admin accordion to My Practice.

## Changes

### 1. Remove accordion/collapsible from To-Do and Round Tables on web/tablet
**File:** `src/pages/Dashboard.tsx`
- For the `lg:block` instances of CompactTodoList and DoctorRoundTables (lines 310-331), render them directly without `Collapsible` wrappers
- Keep the mobile (`lg:hidden`) instances as collapsible (collapsed by default) — actually per user request, remove accordion from those too. Render both To-Do and Round Tables as plain cards on all viewports

**File:** `src/components/dashboard/CompactTodoList.tsx`
- Remove the `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent` wrapper. Render the card with a static primary header (always open)

### 2. Move narration segment description above play controls
**File:** `src/components/dashboard/TodaysBriefing.tsx`
- Move the segment indicator text (`3/4 — Michael Chen`) from inline with play buttons (line 494) to a separate line above the controls row
- Display it as a small centered label above the play/pause/skip buttons when playing

### 3. Remove doctor/patient Vula breakdown from dashboard card
**File:** `src/pages/Dashboard.tsx`
- Change the Vula Vouchers StatsCard `change` prop from `Doctor: ${doctorVulas} · Patient: ${patientVulas}` to a simple label like `"View details"` or remove the subtitle entirely
- Keep the combined total as the value; users drill into `/doctor/rewards` for the breakdown

### 4. Remove Pricing tab from Admin for doctors
**File:** `src/pages/Admin.tsx`
- Remove the "Pricing" TabsTrigger and TabsContent
- This leaves Calendar, To-Do, Invoices, Templates in Admin
- (System admins access pricing via their own admin route)

### 5. Add Pricing Admin accordion under Practice Information in My Practice
**File:** `src/pages/MyPractice.tsx`
- Import `PricingAdmin` from `@/pages/admin/PricingAdmin`
- Add a new `AccordionItem value="pricing"` after the Practice Details accordion (after line 1436)
- Use `DollarSign` icon (already imported) with label "Pricing Administration"
- Render `<PricingAdmin />` inside the accordion content

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Remove collapsibles from To-Do and Round Tables; remove Vula breakdown detail |
| `src/components/dashboard/CompactTodoList.tsx` | Remove Collapsible wrapper, render always-open card |
| `src/components/dashboard/TodaysBriefing.tsx` | Move segment label above play controls |
| `src/pages/Admin.tsx` | Remove Pricing tab |
| `src/pages/MyPractice.tsx` | Add Pricing Admin accordion under Practice Information |

