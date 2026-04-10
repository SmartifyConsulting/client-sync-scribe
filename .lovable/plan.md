

# Multi-Change Plan: Navigation, Logo, Layout, and Styling Updates

## Summary
This plan covers 10 distinct changes across navigation restructuring, logo updates, layout fixes, content reorganization, and styling adjustments.

## Changes

### 1. Replace logo with transparent background version
**Files:** `src/assets/`, `src/components/layout/PatientAppLayout.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/MobileHeader.tsx`, `src/pages/Auth.tsx`, `src/pages/ResetPassword.tsx`, `src/pages/ForgotPassword.tsx`
- Copy uploaded `HolarcLogoClear-2.png` to `src/assets/holarc-logo-clear-2.png`
- Replace `import holarcLogo from "@/assets/holarc-logo.png"` with the new transparent logo in all files that use `holarc-logo.png` (PatientAppLayout, Sidebar, MobileHeader, Auth, ResetPassword, ForgotPassword)
- Landing.tsx already uses `holarc-logo-clear.png` — leave as-is

### 2. Increase logo size by 40% in PatientAppLayout
**File:** `src/components/layout/PatientAppLayout.tsx`
- Change `h-11` to `h-[62px]` (11 * 1.4 ≈ 15.4 = ~62px) on the `<img>` tag at line 123

### 3. Move Edit button below tabs on mobile
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- In view mode (line ~826-832): swap the order so `renderTabsList()` comes before the Edit button div
- In edit mode (line ~1260-1266): same — tabs first, then Done button
- This places the button below the tab bar, not touching it

### 4. Rename bottom nav "Records" to "Admin" with Calendar, Tasks, Documents tabs
**File:** `src/components/layout/BottomNav.tsx`
- Change `{ icon: FolderOpen, label: "Records", section: "records" }` to `{ icon: FolderOpen, label: "Admin", section: "admin" }`

**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Update `SECTION_TABS`: rename `records` key to `admin` and add `"calendar"` and `"tasks"` tabs: `admin: ["calendar", "tasks", "documents"]`
- Remove `"calendar"` from the `care` section: `care: ["doctors", "sessions", "roundtable"]`
- Add a new `TabsTrigger` for "My Tasks" pointing to a `tasks` tab value
- Add a `TabsContent` for `tasks` that renders `<PatientTasks />` (already lazy-importable)
- Import `PatientTasks` as a lazy component

### 5. Remove Medical Overview from patient profile (all layouts)
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Remove the `overview` tab trigger from `renderTabsList()`
- Remove the `TabsContent value="overview"` block (lines ~1172-1183)
- Update `SECTION_TABS.health` from `["medical", "overview"]` to `["medical", "personal"]` (mobile only — see next point)

### 6. Bring Personal Information to Health bottom tab (mobile only)
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Update `SECTION_TABS`: `health: ["medical", "personal"]` (replacing `"overview"`)
- Update `SECTION_TABS`: `profile` section becomes `["nok-iced"]` only (since personal moves to health on mobile) — actually, we need a dashboard here now (see point 7)

### 7. Rename "Profile" to "Home" in bottom nav, add patient dashboard
**File:** `src/components/layout/BottomNav.tsx`
- Change `{ icon: User, label: "Profile", section: "profile" }` to `{ icon: LayoutDashboard, label: "Home", section: "home" }`

**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Add `home` to `SECTION_TABS`: `home: ["dashboard"]`
- Add a `TabsTrigger` for "Dashboard" (only shown on mobile via the `show()` filter)
- Add a `TabsContent value="dashboard"` that renders `<PatientDashboard />` (lazy-loaded)
- Import `PatientDashboard` as lazy component
- Update `SECTION_TABS.profile` to `["personal", "nok-iced"]` — keeping personal in profile for desktop, but on mobile the home section will show dashboard and health section will show personal + medical

Wait — let me reconsider the mapping. On mobile:
- **Home** (bottom nav): Dashboard
- **Health**: Personal Info, Medical Info
- **Care**: Providers, Sessions, Round Table
- **Admin**: Calendar, Tasks, Documents
- **Rewards**: navigates to `/patient/rewards`

On desktop/iPad: all tabs visible (dashboard tab added, overview removed, calendar stays as a tab).

Updated `SECTION_TABS`:
```typescript
const SECTION_TABS: Record<string, string[]> = {
  home: ["dashboard"],
  health: ["personal", "medical"],
  care: ["doctors", "sessions", "roundtable"],
  admin: ["calendar", "tasks", "documents"],
};
```

The `nok-iced` tab remains visible on desktop but doesn't map to any mobile section — it will be accessible via the Personal Information tab or kept in the health section. Actually, NOK & ICE should stay accessible. Let me put it in health: `health: ["personal", "medical", "nok-iced"]`.

### 8. Reporting To Email — add "(Optional)" label
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- View mode (line ~939): Change label from `"Reporting To (Email)"` to `"Reporting To Email (Optional)"`
- Edit mode (line ~1425): Change label similarly and add helper text about medical certificates

### 9. Add Notify and Share to each NOK and ICE record (edit mode)
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- In edit mode NOK records (line ~1347-1360): Add a `Bell` (notify) icon button alongside the existing Share2 button
- In edit mode ICE records (line ~1389-1412): Same — add `Bell` (notify) icon button
- In view mode NOK records (line ~874-884): Add notify + share buttons (currently only share exists for NOK; ICE view has share)
- In view mode ICE records (line ~913-927): Add notify button

### 10. Make all section/frame headings Title Case instead of UPPERCASE
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- In `SectionHeader` component (line ~74): Remove `uppercase` from the className
- Change all `label` props passed to `SectionHeader` to Title Case (they already are Title Case strings like "Personal Details", "Addresses", etc.)
- The `uppercase` CSS class was forcing them to caps lock — removing it will show them in Title Case as written

### 11. Email branding with logo
This requires scaffolding auth email templates. Will use the email template scaffolding tool to set up branded emails with the Holarc logo. This is a separate step that can be done after the UI changes.

## Files Modified Summary

| File | Changes |
|------|---------|
| `src/assets/holarc-logo-clear-2.png` | New file (copy from upload) |
| `src/components/layout/BottomNav.tsx` | Rename Profile→Home, Records→Admin, update icons |
| `src/components/layout/PatientAppLayout.tsx` | Use transparent logo, increase size 40% |
| `src/components/layout/Sidebar.tsx` | Use transparent logo |
| `src/components/layout/MobileHeader.tsx` | Use transparent logo |
| `src/pages/Auth.tsx` | Use transparent logo |
| `src/pages/ResetPassword.tsx` | Use transparent logo |
| `src/pages/ForgotPassword.tsx` | Use transparent logo |
| `src/components/patients/PatientDetailsEditor.tsx` | Move Edit below tabs, remove Medical Overview, add Dashboard/Tasks tabs, update SECTION_TABS, add notify buttons to NOK/ICE, Title Case headings, rename reporting_to_email label |
| Email templates | Scaffold branded auth emails with Holarc logo |

