

# Add Icons, Round Tables, Patient List Spacing, and Restore Sidebar

## Summary
Five changes: add icons to Digital Signature and Voice Narration headers in My Practice, add DoctorRoundTables to the dashboard, increase patient list column spacing on mobile, and restore the left sidebar navigation for web/tablet views.

## Changes

### 1. Add icons to Digital Signature and Voice Narration accordion triggers
**File:** `src/pages/MyPractice.tsx`
- Digital Signature trigger: add `PenTool` icon inline, matching pattern of other accordion headers
- Voice Narration trigger: add `Volume2` icon inline

### 2. Add DoctorRoundTables to Dashboard
**File:** `src/pages/Dashboard.tsx`
- Import `DoctorRoundTables` from `@/components/doctor/DoctorRoundTables`
- Mobile layout: place below RecentActivity with a "My Round Tables" heading
- Desktop/tablet layout: place below CompactTodoList in the right column

### 3. Shift patient list columns further right on mobile
**File:** `src/pages/Patients.tsx`
- Increase padding on Last Seen and Since columns from `px-1` to `px-3` on mobile

### 4. Restore left sidebar for web and tablet views
**File:** `src/components/layout/AppLayout.tsx`
- Re-import `Sidebar` from `./Sidebar`
- Add `<div className="hidden md:block"><Sidebar /></div>` back
- Add `md:ml-[210px]` to the main content wrapper and footer so content is offset on screens >= 768px
- Sidebar remains hidden on mobile (bottom nav is used there instead)

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/MyPractice.tsx` | Add PenTool and Volume2 icons to accordion triggers |
| `src/pages/Dashboard.tsx` | Add DoctorRoundTables below Recent Activity (mobile) and below To-Do (desktop) |
| `src/pages/Patients.tsx` | Increase mobile column padding from px-1 to px-3 |
| `src/components/layout/AppLayout.tsx` | Restore Sidebar for md+ screens with ml offset |

