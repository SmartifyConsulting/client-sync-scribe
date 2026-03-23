

# Standardize Sub-Headings & Update Moola Icon

## What It Does
1. Makes all page sub-headings (the description text below page titles) consistent with the Dashboard style: `text-muted-foreground text-[12px]`
2. Replaces the Moola icon with the uploaded transparent-background M icon

## Changes

### 1. Standardize Sub-Heading Styles Across All Pages

The Dashboard reference style (line 238): `className="mt-2 text-muted-foreground text-[12px]"`

Every `<p>` tag that serves as a page-level sub-heading (directly below an `<h1>`) will be updated to use `text-muted-foreground text-[12px]` instead of the current inconsistent mix of `text-sm text-muted-foreground`, `text-muted-foreground` (unsized), etc.

**Files to update:**
| File | Current sub-heading style |
|------|--------------------------|
| `src/pages/MyPractice.tsx` | `text-sm text-muted-foreground` |
| `src/pages/Settings.tsx` | `text-sm text-muted-foreground` |
| `src/pages/Sessions.tsx` | `text-muted-foreground` (no size) |
| `src/pages/Patients.tsx` | Check & standardize |
| `src/pages/CalendarView.tsx` | Check & standardize |
| `src/pages/Profile.tsx` | `text-sm text-muted-foreground` |
| `src/pages/Notifications.tsx` | Check & standardize |
| `src/pages/Documents.tsx` | Check & standardize |
| `src/pages/TodoList.tsx` | Check & standardize |
| `src/pages/Connections.tsx` | Check & standardize |
| `src/pages/patient/MyDetails.tsx` | `text-sm text-muted-foreground` |
| `src/pages/patient/PatientDashboard.tsx` | Check & standardize |
| `src/pages/patient/PatientCalendar.tsx` | `text-muted-foreground` |
| `src/pages/patient/PatientDocuments.tsx` | Check & standardize |
| `src/pages/patient/MyDoctors.tsx` | Check & standardize |
| `src/pages/patient/MyRewards.tsx` | Check & standardize |
| `src/pages/patient/PatientRoundTable.tsx` | `text-muted-foreground` |
| `src/pages/doctor/DoctorRewards.tsx` | Check & standardize |
| `src/pages/doctor/Invoices.tsx` | Check & standardize |
| `src/pages/ReferralDoctors.tsx` | Check & standardize |
| `src/pages/CPDCertificates.tsx` | Check & standardize |

All page-level description `<p>` tags will become: `className="text-muted-foreground text-[12px]"`

Section-level sub-descriptions within cards/frames will also be standardized to the same `text-[12px]` sizing where they currently use `text-sm`.

### 2. Update Moola Icon with Transparent Background

Copy the uploaded M icon to `src/assets/moola-symbol.png`, replacing the current file. The icon already appears to have a transparent background based on the upload. All existing imports (`Dashboard.tsx`, `LollipopDisplay.tsx`, `DoctorRewards.tsx`) will automatically pick up the new asset.

## Files Modified

| File | Change |
|------|--------|
| ~20 page files | Standardize sub-heading `<p>` tags to `text-muted-foreground text-[12px]` |
| `src/assets/moola-symbol.png` | Replace with uploaded transparent M icon |

