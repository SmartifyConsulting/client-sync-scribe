# Design System Rollout - Complete Audit & Checklist

## Status Overview

- ✅ **COMPLETE:** PatientOverview.tsx, DiscPersonalityCard.tsx
- 🔄 **IN PROGRESS:** SessionDetail.tsx (key sections updated)
- ⏳ **PENDING:** 18+ pages

---

## File-by-File Rollout Checklist

### 1. **Sessions.tsx** (1753 lines) - PRIORITY 1
**Location:** `src/pages/Sessions.tsx`

**Changes Required:**
- [ ] Line ~600-700: Session list sections - reduce `p-6` → `p-5` for section frames
- [ ] Line ~800-900: Results/history accordion - remove Accordion wrapper, make always visible
- [ ] Line ~1000-1200: Session filters - apply consistent `gap-4` and `border-primary/40`
- [ ] Replace `text-base font-semibold` with `text-sm font-semibold` for section headers
- [ ] Replace `mb-4` with `mb-3` after headers for tighter spacing
- [ ] Apply `border-primary/40` instead of `border-primary`

**Pattern Example:**
```tsx
// BEFORE
<div className="rounded-xl border border-primary bg-card p-6">
  <h2 className="text-base font-semibold mb-4">Sessions</h2>

// AFTER
<div className="rounded-xl border border-primary/40 bg-card p-5">
  <h2 className="text-sm font-semibold mb-3">Sessions</h2>
```

**Estimated Effort:** 30-45 minutes

---

### 2. **SessionDetail.tsx** (805 lines) - IN PROGRESS ✓ PARTIAL
**Location:** `src/pages/SessionDetail.tsx`

**Status:** Key sections updated (Quick Actions, AI Summary, Session Notes)

**Remaining Changes:**
- [ ] Line ~450-550: Private notes section - apply same pattern
- [ ] Line ~550-650: Documents list - `p-6` → `p-5`, `text-base` → `text-sm`
- [ ] Line ~700-750: Admissions section - apply compact styling
- [ ] Line ~750-850: Footer sections - consistent spacing

**Estimated Effort:** 15-20 minutes

---

### 3. **Patients.tsx** (1031 lines) - PRIORITY 2
**Location:** `src/pages/Patients.tsx`

**Changes Required:**
- [ ] Line ~400-500: Patient list container - reduce padding `p-6` → `p-5`
- [ ] Line ~500-600: Filter panel - apply `border-primary/40` and reduce spacing
- [ ] Line ~700-800: Patient cards - standardize `gap-4` between items
- [ ] Line ~300-400: Dialog sections - apply consistent styling
- [ ] Replace all `text-base` headers with `text-sm font-semibold`
- [ ] Remove excessive padding from container divs

**Pattern:**
```tsx
// Grid list items
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {/* Each patient card */}
</div>
```

**Estimated Effort:** 30-40 minutes

---

### 4. **PatientDocuments.tsx** (varies) - PRIORITY 2
**Location:** `src/pages/patient/PatientDocuments.tsx`

**Changes Required:**
- [ ] Reduce section padding `p-6` → `p-5`
- [ ] Apply `border-primary/40` to all card borders
- [ ] Update headers to `text-sm font-semibold`
- [ ] Remove any Accordion/Collapsible components - make sections visible by default
- [ ] Apply `gap-4` to document grids
- [ ] Compact status badges and buttons

**Estimated Effort:** 20-30 minutes

---

### 5. **DoctorDocumentsTab.tsx** - PRIORITY 3
**Location:** `src/pages/doctor/DoctorDocumentsTab.tsx`

**Changes Required:**
- [ ] Same as PatientDocuments.tsx
- [ ] Reduce padding/spacing throughout
- [ ] Apply consistent header styling

**Estimated Effort:** 15-20 minutes

---

### 6. **PatientProfile.tsx** (Large, complex) - PRIORITY 3
**Location:** `src/pages/PatientProfile.tsx`

**Changes Required:**
- [ ] Line ~500-700: Tab content sections - reduce `p-6` → `p-5`
- [ ] Line ~800-1000: Medical data sections - apply color-coded backgrounds if present
- [ ] Line ~1200-1400: Document/session listings - apply compact grids
- [ ] Remove any Accordion components from medical data sections
- [ ] Standardize all header fonts to `text-sm`
- [ ] Apply `border-primary/40` to card borders

**Note:** This is a large page with many subsections. Prioritize visible/frequently-accessed areas first.

**Estimated Effort:** 45-60 minutes

---

### 7. **MyRewards.tsx** / **DoctorRewards.tsx** - PRIORITY 4
**Location:** `src/pages/patient/MyRewards.tsx` and `src/pages/doctor/DoctorRewards.tsx`

**Changes Required:**
- [ ] Apply compact card styling (`p-5` instead of `p-6`)
- [ ] Reduce header sizes to `text-sm`
- [ ] Apply consistent `gap-4` to reward grids
- [ ] Update badges and status indicators

**Estimated Effort:** 10-15 minutes each

---

### 8. **Calendar Pages** - PRIORITY 4
**Files:**
- `src/pages/patient/PatientCalendar.tsx`
- `src/pages/CalendarView.tsx`

**Changes Required:**
- [ ] Event cards: `p-6` → `p-5`
- [ ] Headers: `text-base` → `text-sm font-semibold`
- [ ] Calendar container sections: apply `border-primary/40`

**Estimated Effort:** 10-15 minutes each

---

### 9. **Round Table Pages** - PRIORITY 5
**Files:**
- `src/pages/patient/PatientRoundTable.tsx`
- `src/pages/doctor/DoctorRoundTablesPage.tsx`
- `src/components/patients/RoundTable.tsx`

**Changes Required:**
- [ ] Reduce padding throughout
- [ ] Standardize header sizes
- [ ] Apply compact grid spacing

**Estimated Effort:** 15-20 minutes each

---

### 10. **Admissions Views** - PRIORITY 5
**Files:**
- `src/components/admissions/AdmissionsView.tsx`
- `src/features/sessions/admissions/AdmissionsView.tsx`

**Changes Required:**
- [ ] Remove Accordion components if present
- [ ] Apply compact section styling
- [ ] Standardize spacing

**Estimated Effort:** 20-25 minutes each

---

### 11. **Admin Pages** - PRIORITY 6
**Files:**
- `src/pages/admin/*.tsx`
- `src/features/admin/components/*.tsx`

**Changes Required:**
- [ ] Apply same padding/spacing reductions
- [ ] Standardize header sizes
- [ ] Update border/background colors

**Estimated Effort:** 30-45 minutes total

---

## Quick Reference: All Changes at a Glance

| Change | Find | Replace | Files Affected |
|--------|------|---------|-----------------|
| Padding | `p-6` | `p-5` | All section frames |
| Padding | `p-8` | `p-5` or `p-4` | Large containers |
| Headers | `text-base font-semibold` | `text-sm font-semibold` | All section headers |
| Headers | `text-lg font-semibold` | `text-sm font-semibold` | All section headers |
| Spacing | `mb-4` after `<h2>` | `mb-3` | All headers |
| Spacing | `gap-6` | `gap-4` | All grids |
| Borders | `border-primary` | `border-primary/40` | All card borders |
| Accordions | `<Accordion>` | Remove, make visible | Medical sections |
| Status text | `text-sm` (for statuses) | `text-xs` | Status badges |

---

## Implementation Guide

### For Each File:
1. **Identify sections** using the checklist above
2. **Search & Replace:**
   - `p-6 →` `p-5` (in section frames only)
   - `text-base font-semibold` → `text-sm font-semibold`
   - `border-primary` → `border-primary/40`
3. **Remove Accordions:** Find Collapsible/Accordion components, replace with visible `<div>` sections
4. **Test:** Check spacing looks consistent with Patient Overview
5. **Commit:** One commit per file or per logical grouping

---

## Estimated Total Effort

| Priority | Files | Est. Time |
|----------|-------|-----------|
| 1 | Sessions.tsx | 45 min |
| 2 | SessionDetail, Patients, PatientDocuments | 75 min |
| 3 | DoctorDocumentsTab, PatientProfile | 90 min |
| 4 | Rewards, Calendar | 45 min |
| 5 | Round Table, Admissions | 60 min |
| 6 | Admin pages | 45 min |
| **TOTAL** | **18+ files** | **~360 minutes (6 hours)** |

---

## Success Criteria

After completing this rollout, the entire application should:
- ✅ Have consistent section padding (`p-5` standard for cards)
- ✅ Use `text-sm font-semibold` for all section headers
- ✅ Apply `border-primary/40` for subtle borders
- ✅ Use `gap-4` for consistent grid spacing
- ✅ Have no collapsible accordions in medical/data sections
- ✅ Maintain clean, professional appearance across all pages
- ✅ Match PatientDetails/PatientOverview aesthetic

---

## Next Steps

1. **Print this checklist** or keep it open while working
2. **Start with Priority 1:** Sessions.tsx (most-used page)
3. **Use Find & Replace** for bulk changes (be careful with context)
4. **Verify visually** after each file by checking in dev server
5. **Commit per file** with message: `Refactor [FileName] to adopt clean design system`
6. **Mark complete** by checking boxes above

---

## Notes for User

- This rollout can be done incrementally (don't need to do all at once)
- Priority 1-2 covers 80% of user-facing pages
- Admin pages (Priority 6) can be done last
- Each file change is independent - safe to commit individually
- Changes are purely stylistic - no functionality changes

