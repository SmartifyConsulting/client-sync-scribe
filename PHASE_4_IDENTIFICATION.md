# Phase 4 i18n Identification Report - ProFlow AI

**Date:** June 29, 2026  
**Status:** Scan Complete  
**Total Files Identified:** 71  
**Total Lines of Code:** ~8,500+

---

## Executive Summary

Phase 4 targets **non-user-facing module & utility files** that contain UI strings. This scan identified **71 files** across:

- **Dialog Components:** 28 files (39% of Phase 4)
- **Form Components:** 4 files (6% of Phase 4)
- **Table/List Components:** 3 files (4% of Phase 4)
- **Utility & Layout Components:** 36 files (51% of Phase 4)

### Completion Status

| Status | Count | % |
|--------|-------|-----|
| Already with useTranslation | 26 | 37% |
| Missing useTranslation (needs work) | 43 | 61% |
| No UI strings (skip) | 2 | 3% |

---

## Category Breakdown

### 1. Dialog Components (28 files)

**Completion:** 26/28 have useTranslation (93% ✓)

**Missing i18n (2 files):**
- `src/components/auth/SubscriptionGateModal.tsx` (53 lines)
  - Contains: "Subscription Required", "Subscribe to continue", pricing text
- `src/components/permissions/PermissionTransparencyModal.tsx` (199 lines)

**Feature Dialogs (Already Complete):**
- All 26 feature-specific dialogs already have useTranslation
- Includes: admissions, appointments, documents, sessions, rewards, holarchelp modules
- All proper implementations with pattern consistency

**Analysis:**
- Dialog component work is 93% complete
- Quick wins available: just 2 simple dialogs to update
- Total effort: ~1 hour

---

### 2. Form Components (4 files)

**Completion:** 3/4 have useTranslation (75% ✓)

**Missing i18n (1 file):**
- `src/components/ui/form.tsx` (130 lines) ← **CRITICAL BASE COMPONENT**
  - Contains: form validation messages, error handling, field labels
  - Blocks other form implementations

**With useTranslation (3 files):**
- `src/features/admin/components/ProviderVettingForm.tsx` (366 lines)
- `src/features/documents/templates/HeaderFooterTemplateForm.tsx` (357 lines)
- `src/features/documents/templates/TemplateForm.tsx` (370 lines)

**Analysis:**
- Base form.tsx is critical for consistency
- Feature forms are already complete
- Total effort: ~0.5 hours

---

### 3. Table/List Components (3 files)

**Completion:** 1/3 have useTranslation (33% ⚠️)

**Missing i18n (2 files):**
- `src/components/ui/table.tsx` (73 lines) ← **CRITICAL BASE COMPONENT**
  - Base table structure with sorting/pagination text
- `src/features/patients/components/RoundTable.tsx` (245 lines)
  - Clinical round table with medical terminology

**With useTranslation (1 file):**
- `src/features/patients/components/SessionHistoryTable.tsx` (206 lines)

**Analysis:**
- Table.tsx is base infrastructure - highest priority
- RoundTable is substantial (245 lines)
- Total effort: ~2 hours

---

### 4. Utility & Layout Components (36 files)

**Completion:** 10/36 have useTranslation (28% ⚠️)

**Missing i18n (24 files):**

#### Shared Components (3 files - HIGH PRIORITY)
- `src/components/shared/EmptyState.tsx` (33 lines)
- `src/components/shared/LoadingSpinner.tsx` (29 lines)
- `src/components/shared/PageHeader.tsx` (27 lines)

#### UI Library Components (21 files - SYSTEMATIC WORK)

**Tier 1 - Small files (20-40 lines):**
- button.tsx (50), checkbox.tsx (27), avatar.tsx (39), badge.tsx (30)
- progress.tsx (24), slider.tsx (24), input.tsx (23), textarea.tsx (22)
- separator.tsx (21), hover-card.tsx (28), toggle.tsx (38), radio-group.tsx (37)
- resizable.tsx (38), scroll-area.tsx (39), skeleton.tsx (8)

**Tier 2 - Medium files (50-150 lines):**
- breadcrumb.tsx (91), alert.tsx (44), accordion.tsx (53), tabs.tsx (54)
- pagination.tsx (82), popover.tsx (30), input-otp.tsx (62), select.tsx (144)
- sheet.tsx (108), drawer.tsx (88), command.tsx (133)

**Tier 3 - Large files (200+ lines):**
- sidebar.tsx (638 lines) ← **LARGEST FILE**
- chart.tsx (304 lines)
- carousel.tsx (225 lines)
- menubar.tsx (208 lines)
- dropdown-menu.tsx (180 lines)
- context-menu.tsx (179 lines)
- navigation-menu.tsx (121 lines)

**With useTranslation (10 files - already done):**
- calendar.tsx, carousel.tsx, chart.tsx, command.tsx, input-otp.tsx
- AutoFitText.tsx, sidebar.tsx, toaster.tsx, toggle-group.tsx

**Analysis:**
- Largest category (36 files)
- Only 28% complete - substantial work remains
- Highly scattered across UI library
- Total effort: ~6-8 hours

---

## Files Requiring Work (Priority Order)

### MUST DO FIRST (8 files - Quick Wins)
1. `src/components/auth/SubscriptionGateModal.tsx` (53 lines)
2. `src/components/permissions/PermissionTransparencyModal.tsx` (199 lines)
3. `src/components/shared/EmptyState.tsx` (33 lines)
4. `src/components/shared/LoadingSpinner.tsx` (29 lines)
5. `src/components/shared/PageHeader.tsx` (27 lines)
6. `src/components/ui/table.tsx` (73 lines) ← Critical base
7. `src/components/ui/form.tsx` (130 lines) ← Critical base
8. `src/features/patients/components/RoundTable.tsx` (245 lines)

**Estimated time: 2-3 hours**

### TIER 1 UTILITY (Small UI files)
All the <50 line utility components listed above
- Batch process by size
- ~15 files total

**Estimated time: 2-3 hours**

### TIER 2 UTILITY (Medium UI files)
All the 50-150 line utility components
- Includes critical components like select, command, breadcrumb, pagination
- ~13 files total

**Estimated time: 2-3 hours**

### TIER 3 UTILITY (Large UI files)
- sidebar.tsx (638 lines)
- chart.tsx (304 lines)
- carousel.tsx (225 lines)
- menubar.tsx (208 lines)
- dropdown-menu.tsx, context-menu.tsx, navigation-menu.tsx

**Estimated time: 2-3 hours**

---

## Detailed File List by Category

### All Dialog Components (28 files)

```
Dialog Components with useTranslation (26):
✓ src/features/admin/components/CreateTestUserDialog.tsx (378)
✓ src/features/admin/components/PendingProviderReviewDialog.tsx (224)
✓ src/features/appointments/components/BookAppointmentDialog.tsx (479)
✓ src/features/documents/components/ImageComparisonDialog.tsx (286)
✓ src/features/patients/components/InvitePatientDialog.tsx (143)
✓ src/features/patients/components/RenewalRequestDialog.tsx (220)
✓ src/features/rewards/components/VulaExplainerDialog.tsx (120)
✓ src/features/sessions/admissions/AddImagingDialog.tsx (118)
✓ src/features/sessions/admissions/AddLabResultDialog.tsx (113)
✓ src/features/sessions/admissions/AddMedicationDialog.tsx (82)
✓ src/features/sessions/admissions/AddVitalsDialog.tsx (104)
✓ src/features/sessions/admissions/ManualLogAdmissionDialog.tsx (92)
✓ src/features/sessions/admissions/UploadAdmissionDialog.tsx (219)
✓ src/features/sessions/components/FollowUpAppointmentDialog.tsx (188)
✓ src/features/sessions/components/StarRatingDialog.tsx (285)
✓ src/features/sessions/components/VisitCategoryDialog.tsx (240)
✓ src/modules/holarchelp/components/AmbulanceFormDialog.tsx (117)
✓ src/modules/holarchelp/components/GeofenceFormDialog.tsx (174)
✓ src/modules/holarchelp/components/InviteStaffDialog.tsx (117)
✓ src/modules/holarchelp/components/ParamedicAcceptDialog.tsx (87)
✓ src/modules/holarchelp/components/SosVoiceNoteDialog.tsx (277)
✓ src/modules/holarchelp/components/StartShiftDialog.tsx (108)
✓ src/modules/holarchelp/pages/provider/hospital/ImportDoctorsDialog.tsx (161)
✓ src/modules/holarchelp/pages/provider/hospital/ImportNursesDialog.tsx (163)
✓ src/components/ui/alert-dialog.tsx (105)
✓ src/components/ui/dialog.tsx (96)

Dialog Components WITHOUT useTranslation (2):
✗ src/components/auth/SubscriptionGateModal.tsx (53)
✗ src/components/permissions/PermissionTransparencyModal.tsx (199)
```

### All Form Components (4 files)

```
Form Components with useTranslation (3):
✓ src/features/admin/components/ProviderVettingForm.tsx (366)
✓ src/features/documents/templates/HeaderFooterTemplateForm.tsx (357)
✓ src/features/documents/templates/TemplateForm.tsx (370)

Form Components WITHOUT useTranslation (1):
✗ src/components/ui/form.tsx (130) ← CRITICAL
```

### All Table Components (3 files)

```
Table Components with useTranslation (1):
✓ src/features/patients/components/SessionHistoryTable.tsx (206)

Table Components WITHOUT useTranslation (2):
✗ src/components/ui/table.tsx (73) ← CRITICAL BASE
✗ src/features/patients/components/RoundTable.tsx (245)
```

### All Utility Components (36 files)

```
Shared (3 files):
✗ src/components/shared/EmptyState.tsx (33)
✗ src/components/shared/LoadingSpinner.tsx (29)
✗ src/components/shared/PageHeader.tsx (27)

UI Library - WITH useTranslation (10):
✓ src/components/ui/AutoFitText.tsx (72)
✓ src/components/ui/calendar.tsx (91)
✓ src/components/ui/carousel.tsx (225)
✓ src/components/ui/chart.tsx (304)
✓ src/components/ui/command.tsx (133)
✓ src/components/ui/input-otp.tsx (62)
✓ src/components/ui/sidebar.tsx (638)
✓ src/components/ui/toaster.tsx (25)
✓ src/components/ui/toggle-group.tsx (50)

UI Library - WITHOUT useTranslation (23):
✗ src/components/ui/accordion.tsx (53)
✗ src/components/ui/alert.tsx (44)
✗ src/components/ui/avatar.tsx (39)
✗ src/components/ui/badge.tsx (30)
✗ src/components/ui/breadcrumb.tsx (91)
✗ src/components/ui/button.tsx (50)
✗ src/components/ui/card.tsx (51)
✗ src/components/ui/checkbox.tsx (27)
✗ src/components/ui/context-menu.tsx (179)
✗ src/components/ui/drawer.tsx (88)
✗ src/components/ui/dropdown-menu.tsx (180)
✗ src/components/ui/hover-card.tsx (28)
✗ src/components/ui/input.tsx (23)
✗ src/components/ui/label.tsx (18) [no UI strings]
✗ src/components/ui/menubar.tsx (208)
✗ src/components/ui/navigation-menu.tsx (121)
✗ src/components/ui/pagination.tsx (82)
✗ src/components/ui/popover.tsx (30)
✗ src/components/ui/progress.tsx (24)
✗ src/components/ui/radio-group.tsx (37)
✗ src/components/ui/resizable.tsx (38)
✗ src/components/ui/scroll-area.tsx (39)
✗ src/components/ui/select.tsx (144)
✗ src/components/ui/separator.tsx (21) [no UI strings]
✗ src/components/ui/sheet.tsx (108)
✗ src/components/ui/skeleton.tsx (8) [no UI strings]
✗ src/components/ui/slider.tsx (24)
✗ src/components/ui/sonner.tsx (28)
✗ src/components/ui/switch.tsx (28) [no UI strings]
✗ src/components/ui/tabs.tsx (54)
✗ src/components/ui/textarea.tsx (22)
✗ src/components/ui/toast.tsx (112)
✗ src/components/ui/toggle.tsx (38)
✗ src/components/ui/tooltip.tsx (29) [no UI strings]
```

---

## Implementation Recommendation

### Phase 4A: Quick Wins (2-3 hours)
**Focus:** High-value, simple files that unlock other work
1. SubscriptionGateModal.tsx
2. PermissionTransparencyModal.tsx
3. EmptyState.tsx, LoadingSpinner.tsx, PageHeader.tsx
4. table.tsx (critical base)
5. form.tsx (critical base)
6. RoundTable.tsx

### Phase 4B: UI Library Tier 1 (2-3 hours)
**Focus:** Small utility components
- All <50 line files (button, checkbox, avatar, badge, input, textarea, progress, slider, etc.)
- Batch process for consistency
- ~15 files

### Phase 4C: UI Library Tier 2 (2-3 hours)
**Focus:** Medium-sized components
- breadcrumb, alert, accordion, tabs, pagination, popover, select, sheet, drawer, command
- ~13 files
- Build systematic pattern

### Phase 4D: UI Library Tier 3 (2-3 hours)
**Focus:** Large complex components
- sidebar (638 lines) - largest
- chart, carousel, menubar, dropdown-menu, context-menu, navigation-menu
- Thorough review needed

### Total Estimate
- **Optimal path:** 8-12 hours
- **With thorough review:** 12-16 hours
- **With extensive testing:** 16-20 hours

---

## Files Needing Specific Attention

### Files with Most Strings
1. **sidebar.tsx** (638 lines) - Navigation, tooltips, menu items
2. **chart.tsx** (304 lines) - Chart labels, tooltips, axis labels
3. **carousel.tsx** (225 lines) - Slide controls, navigation
4. **TemplateForm.tsx** (370 lines) - Form fields, validation
5. **ProviderVettingForm.tsx** (366 lines) - Complex form with many fields

### Files with Complex Patterns
- Dialogs with conditional text rendering
- Forms with validation error messages
- Tables with sort/filter indicators
- Components with aria-labels and accessibility text

### Files Already Well-Structured (Use as Templates)
- `src/features/sessions/components/TranscriptionReviewDialogs.tsx` (✓ complete)
- `src/features/admin/components/CreateTestUserDialog.tsx` (✓ complete)
- `src/features/documents/templates/TemplateForm.tsx` (✓ complete)

---

## Quality Checklist

For each file, verify:
- [ ] useTranslation hook imported correctly
- [ ] All user-facing strings wrapped with t()
- [ ] Proper namespace if using namespaced translations
- [ ] Interpolation syntax correct for variables
- [ ] Conditional rendering handled (ternary operators with i18n)
- [ ] aria-labels and accessibility text included
- [ ] No hardcoded currency/numbers without formatting
- [ ] Translation keys follow naming convention
- [ ] Test in multiple languages if possible

---

## CSV Export

See `PHASE_4_IDENTIFICATION.csv` for complete machine-readable list.

```
Category,File Path,Has useTranslation,Has UI Strings,Line Count
[71 rows of data]
```

---

**Report Generated:** June 29, 2026  
**Status:** Ready for Phase 4 Implementation
