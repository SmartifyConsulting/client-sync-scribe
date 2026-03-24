

# Standardise App UI: Remove Inconsistencies

## Problem
The app has grown organically, leading to inconsistent typography, spacing, and component styling across screens. Key inconsistencies found:

**Page Headings:** Mix of `text-3xl`, `text-2xl`, `text-lg` for main `<h1>` headings
**Sub-headings:** Mix of `text-muted-foreground` (no size), `text-[12px]`, `text-sm` for page descriptions
**Section headings:** Mix of `text-lg font-semibold`, `text-sm font-semibold`, `text-xl font-semibold` inside cards/frames
**Form labels:** Mix of `text-sm font-medium`, `text-[11px]` (Label component), and raw `<label>` vs `<Label>`
**Frame padding:** Mix of `p-4`, `p-6`, `p-3` on similar card/frame containers
**Icon sizes in section headers:** Mix of `h-5 w-5` and `h-4 w-4`
**Stat card values:** Mix of `text-3xl`, `text-2xl`, `text-xl` for numbers

## Design System Standards (Based on Existing Memories)

Per the project's established conventions:
- **Page heading (h1):** `text-2xl font-bold text-foreground` (not text-3xl — too large for clinical density)
- **Page sub-heading:** `text-muted-foreground text-[12px]`
- **Section heading (h2/h3 in frames):** `text-sm font-semibold text-foreground` with `h-4 w-4 text-primary` icon
- **Section description:** `text-sm text-muted-foreground` → standardise to `text-[12px] text-muted-foreground`
- **Form labels:** Use `<Label>` component (`text-[11px]`) everywhere, not raw `<label class="text-sm">`
- **Input text:** `text-[12px]` (already in Input component)
- **Frame containers:** `rounded-xl border border-primary bg-card p-4 shadow-sm`
- **Card stat values:** `text-2xl font-bold` (not text-3xl)
- **Empty state text:** `text-sm` for title, `text-[12px]` for description

## Changes by File

### Pages with `text-3xl` h1 → change to `text-2xl`
| File | Line(s) | Current | Target |
|------|---------|---------|--------|
| `Dashboard.tsx` | 238 | `text-3xl font-bold` | `text-2xl font-bold` |
| `Patients.tsx` | 375 | `text-3xl font-bold` | `text-2xl font-bold` |
| `Notifications.tsx` | 355 | `text-3xl font-bold` | `text-2xl font-bold` |
| `Documents.tsx` | 363 | `text-3xl font-bold` | `text-2xl font-bold` |
| `Connections.tsx` | 346 | `text-3xl font-bold` | `text-2xl font-bold` |
| `doctor/Invoices.tsx` | 830 | `text-3xl font-bold` | `text-2xl font-bold` |
| `admin/GamificationAdmin.tsx` | 269 | `text-3xl font-bold` | `text-2xl font-bold` |
| `admin/PricingAdmin.tsx` | 145 | `text-3xl font-bold` | `text-2xl font-bold` |
| `ReferralDoctors.tsx` | heading | `text-3xl font-bold` | `text-2xl font-bold` |

### Pages with unsized sub-heading descriptions → add `text-[12px]`
| File | Current | Target |
|------|---------|--------|
| `Patients.tsx` (376) | `text-muted-foreground` (no size) | `text-muted-foreground text-[12px]` |
| `Documents.tsx` (364) | `text-muted-foreground` (no size) | `text-muted-foreground text-[12px]` |
| `admin/GamificationAdmin.tsx` (270) | `text-muted-foreground` (no size) | `text-muted-foreground text-[12px]` |
| `admin/PricingAdmin.tsx` (146) | `text-muted-foreground` (no size) | `text-muted-foreground text-[12px]` |

### Section headings inside frames → standardise to `text-sm font-semibold`
| File | Current | Target |
|------|---------|--------|
| `Settings.tsx` (~307, 412, 468, 495) | `text-lg font-semibold` | `text-sm font-semibold` |
| `Sessions.tsx` (~1286) | `text-xl font-semibold` | `text-sm font-semibold` |
| `Settings.tsx` section icons (~306, 411, 467, 494) | `h-5 w-5` | `h-4 w-4` |

### Frame padding → standardise to `p-4`
| File | Current | Target |
|------|---------|--------|
| `Settings.tsx` (~409, 465, 492) | `p-6` | `p-4` |

### Form labels in dialogs → use `<Label>` instead of raw `<label>`
| File | Current |
|------|---------|
| `CalendarView.tsx` (~311, 319, 328) | `<label className="text-sm font-medium">` → `<Label>` |
| `Patients.tsx` (~411, 465, 474, 488, 508, 524, 532, 547, 555, 563, 571, 579, 595) | `<label className="text-sm font-medium">` → `<Label>` |

### Stat card values → standardise to `text-2xl`
| File | Current | Target |
|------|---------|--------|
| `admin/GamificationAdmin.tsx` (~282, 290, 300, 310) | `text-3xl font-bold` | `text-2xl font-bold` |
| `patient/PatientDashboard.tsx` (~340) | `text-3xl font-bold` | `text-2xl font-bold` |
| `doctor/DoctorRewards.tsx` (~131, 156) | `text-3xl font-bold` | `text-2xl font-bold` |

### Empty state text → standardise
| File | Current | Target |
|------|---------|--------|
| `Notifications.tsx` (~614, 790) | `text-lg font-medium` | `text-sm font-medium` |

### Settings section descriptions → standardise to `text-[12px]`
| File | Current | Target |
|------|---------|--------|
| `Settings.tsx` (~414, 470) | `text-sm text-muted-foreground` | `text-[12px] text-muted-foreground` |

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | h1 text-3xl → text-2xl |
| `src/pages/Patients.tsx` | h1 text-3xl → text-2xl, sub-heading size, labels → `<Label>` |
| `src/pages/Notifications.tsx` | h1 text-3xl → text-2xl, empty state text size |
| `src/pages/Documents.tsx` | h1 text-3xl → text-2xl, sub-heading size |
| `src/pages/Connections.tsx` | h1 text-3xl → text-2xl |
| `src/pages/Settings.tsx` | Section heading sizes, icon sizes, padding, description sizes |
| `src/pages/Sessions.tsx` | "All Sessions" heading text-xl → text-sm |
| `src/pages/CalendarView.tsx` | Form labels → `<Label>` |
| `src/pages/ReferralDoctors.tsx` | h1 text-3xl → text-2xl |
| `src/pages/doctor/Invoices.tsx` | h1 text-3xl → text-2xl |
| `src/pages/admin/GamificationAdmin.tsx` | h1 + stat values text-3xl → text-2xl, sub-heading size |
| `src/pages/admin/PricingAdmin.tsx` | h1 text-3xl → text-2xl, sub-heading size |
| `src/pages/patient/PatientDashboard.tsx` | Stat value text-3xl → text-2xl |
| `src/pages/doctor/DoctorRewards.tsx` | Stat values text-3xl → text-2xl |

No branding changes. No new components. Pure consistency pass.

