

# Plan: Restore Patient Nav Layout & Fix Holarchive Heading

## 1. Bottom Nav — `src/components/layout/BottomNav.tsx`

Replace `patientSections` with the original 5-item layout (no Admissions):

```ts
const patientSections = [
  { icon: LayoutDashboard, label: "Home", section: "home" },
  { icon: HeartPulse, label: "My Profile", section: "health" },
  { icon: Handshake, label: "Holarchy", section: "care" },
  { icon: FolderOpen, label: "My Desk", section: "admin" },
  { icon: Gift, label: "My Rewards", section: "rewards" },
];
```

- Removes the `Admissions` (Hospital) slot
- Renames `Holarchive` → `My Profile`
- Restores `My Desk` and `My Rewards` to the final two slots

## 2. Sidebar — `src/components/layout/Sidebar.tsx`

In `patientNavItems`:
- Re-add `My Rewards` entry (icon: Gift, to: `/patient/rewards`)
- Rename the "Holarchive" link label to `My Profile` (keep `?section=health`)
- Ensure the "Holarchy" entry exists pointing to `?section=care`

## 3. Avatar Popover — `src/components/layout/TopBarIcons.tsx`

Remove the `My Rewards` link that was previously inserted above `Settings` in the avatar popover (for both patient and doctor flows — keep only the doctor `My Rewards` link if it existed pre-change; for patients remove it entirely since it's back on the bottom nav).

## 4. Holarchive screen heading — `src/components/patients/PatientDetailsEditor.tsx`

Currently the page heading stays as "My Holarchive" regardless of section. Update the heading logic so the title reflects which bottom-nav section is active:

| `?section=` | Heading shown |
|---|---|
| `home` | My Home |
| `health` | My Profile |
| `care` | **My Holarchive** ← (per the user's request) |
| `admin` | My Desk |
| `rewards` | My Rewards |

The user's specific ask: when **Holarchy** is clicked from the nav bar, the heading should become **My Holarchive** (instead of staying static). Implement a `sectionHeading` derived from the `section` query param and render that in the page header.

Also confirm the `SECTION_TABS` mapping no longer references `admissions` or `hospital_visits` for the bottom-nav routing (the Hospital Visits tab itself can remain inside the `care` section as previously added — only the nav slot is removed).

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/layout/BottomNav.tsx` | Restore original 5-item nav (Home, My Profile, Holarchy, My Desk, My Rewards) |
| `src/components/layout/Sidebar.tsx` | Rename Holarchive→My Profile; re-add My Rewards |
| `src/components/layout/TopBarIcons.tsx` | Remove patient My Rewards link from avatar popover |
| `src/components/patients/PatientDetailsEditor.tsx` | Dynamic page heading per section; "Holarchy" section shows "My Holarchive" |

