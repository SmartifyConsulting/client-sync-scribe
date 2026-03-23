

# Plan: Add Consistent Tab Content Headings

## Problem

When you click a tab (e.g. "Personal Information", "Medical Information", "My Round Table"), the content area doesn't show a matching heading. The tabs say one thing but the content inside starts with different section titles or no heading at all because `hideHeader` suppresses them.

## Changes

### 1. PatientDetailsEditor — Add tab-level headings (view mode & edit mode)

**File**: `src/components/patients/PatientDetailsEditor.tsx`

Add a heading block at the top of each TabsContent area, before the section frames:

| Tab | Heading to add |
|-----|---------------|
| Personal Information | `<h2>Personal Information</h2>` + description "View and manage personal details" |
| Medical Information | `<h2>Medical Information</h2>` + description "View and manage medical records" |
| My Documents | `<h2>My Documents</h2>` + description "View your medical documents" |
| My Doctors | `<h2>My Doctors</h2>` + description "View your healthcare providers" |
| My Round Table | `<h2>My Round Table</h2>` + description "Notes shared by your care team" |

For Documents, Doctors, and Round Table: remove `hideHeader` prop so the components show their own built-in headings instead of adding duplicate ones. Update `PatientRoundTable` so its heading says **"My Round Table"** (currently says just "Round Table").

### 2. PatientRoundTable — Fix heading text

**File**: `src/pages/patient/PatientRoundTable.tsx`

Change `"Round Table"` → `"My Round Table"` in the `<h1>` tag.

### 3. Settings tabs — already consistent

Settings tabs (Preferences, Notifications, Security, Billing) already have matching `<h2>` headings inside each tab content. No changes needed there.

## Files Modified

| File | Change |
|------|--------|
| `src/components/patients/PatientDetailsEditor.tsx` | Add heading blocks for Personal Information and Medical Information tabs; remove `hideHeader` from Documents, Doctors, RoundTable |
| `src/pages/patient/PatientRoundTable.tsx` | Change heading to "My Round Table" |

