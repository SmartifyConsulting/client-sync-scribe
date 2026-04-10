

# UI Fixes: Avatar Profile Link, Section Headings, Landing Page Redesign

## 1. Remove "Profile" link from avatar popover

**File:** `src/components/layout/TopBarIcons.tsx` (line 164-165)

Remove the "Profile" link from the avatar popover dropdown. The user already has "My Holarchive" in the sidebar to access their profile. Keep Settings and Sign Out.

## 2. Format "Surgeries and Dates" heading to match "Medical Information" heading

**File:** `src/components/patients/PatientDetailsEditor.tsx`

The "Medical Information" section heading uses this style:
```
<h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5">
  <Activity className="h-3.5 w-3.5" /> Medical Information
</h3>
```

Change all instances of the "Surgeries and Dates" `<Label>` (lines 853, 1244) to use the same `h3` format with a `Scissors` icon:
```
<h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5">
  <Scissors className="h-3.5 w-3.5" /> Surgeries and Dates
</h3>
```

## 3. Format "Family History" heading to match "Medical Information" heading

Same file, same treatment. Change all instances of the "Family History" `<Label>` (lines 871, 1300) to use the `h3` format with a `GitBranch` icon:
```
<h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5">
  <GitBranch className="h-3.5 w-3.5" /> Family History
</h3>
```

## 4. Redesign Landing Page with prominent Holarc logo

**File:** `src/pages/Landing.tsx`

Based on the attached screenshot, redesign the hero section to place the Holarc Health logo prominently and centrally:

- Move the logo from the nav bar into the hero section, displayed large and centered below the heading text
- Increase logo size significantly (e.g., `h-32 sm:h-40 w-auto`) so it's the visual centerpiece
- Keep the heading "One Ecosystem. 360° Healthcare Intelligence." above the logo
- Keep the tagline paragraph below the logo
- Nav bar retains "Doctors Login", "Patients Login", and "Get Started" buttons but without the logo (or with a smaller version)
- Remove the ecosystem features grid from the hero to clean up the layout — the benefits sections below already cover this
- Keep the CTA buttons ("Join the Ecosystem", "Doctors", "Patients") below the tagline

Layout structure:
```text
┌─────────────────────────────────────────────┐
│  [nav: Doctors Login | Patients Login | Get Started] │
├─────────────────────────────────────────────┤
│                                             │
│         One Ecosystem.                      │
│    360° Healthcare Intelligence.            │
│                                             │
│         [  Holarc Health Logo  ]            │
│            (large, centered)                │
│                                             │
│    Powerful practice management...          │
│                                             │
│  [Join the Ecosystem] [Doctors] [Patients]  │
│                                             │
└─────────────────────────────────────────────┘
```

## Technical Summary

| File | Change |
|------|--------|
| `src/components/layout/TopBarIcons.tsx` | Remove "Profile" link from avatar popover |
| `src/components/patients/PatientDetailsEditor.tsx` | Format Surgery and Family History headings as uppercase h3 with icons |
| `src/pages/Landing.tsx` | Redesign hero with large centered logo, remove feature grid |

