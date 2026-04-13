

# Multi-Fix: Signup Fields, Share App, Password Eye, Edit Button, Mobile Tab Filtering

## Changes

### 1. Split Full Name into First Name + Last Name on signup
**File:** `src/pages/Auth.tsx`
- Replace the single `fullName` state with `firstName` and `lastName` states
- Update both doctor (step 0, line 538-543) and patient (step 0, line 709-714) signup forms to show two fields: "First Name(s)" and "Last Name"
- Update all references: `handleFinalSubmit` constructs `fullName = firstName + " " + lastName` for profile/patient inserts
- Update draft save/load to use firstName/lastName
- Update `handleNext` validation to check both fields

### 2. Add password visibility toggle (eye icon)
**File:** `src/pages/Auth.tsx`
- Add `showPassword` state
- On every password `<Input>` (login form line 872, doctor signup line 556, patient signup line 727), change `type` to `showPassword ? "text" : "password"` and add an Eye/EyeOff toggle button inside the relative wrapper
- Import `Eye, EyeOff` from lucide-react

### 3. Restore Share App in avatar popover
**File:** `src/components/layout/TopBarIcons.tsx`
- Import `ShareAppDialog` and `Share2` icon
- Add a "Share App" menu item in the avatar PopoverContent, placed between "Settings" and "Sign Out" links
- Use `ShareAppDialog` with a custom trigger styled like the other popover items

### 4. Add inline edit pencil on Personal Information heading (view mode)
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- In the view mode Personal Information tab (line 1281-1284), add a `Pencil` icon button inline with the "Personal Information" heading that triggers `setIsEditing(true)`
- On desktop/tablet: show as a small button with "Edit" text
- On mobile: show just the pencil icon
- Same for Medical Information heading

### 5. Fix mobile bottom nav default to "home" and tab filtering
**File:** `src/components/layout/BottomNav.tsx`
- Line 76: Change default from `"profile"` to `"home"` so when user first loads `/patient/details` without a section param, Home is highlighted and Dashboard tab shows

**File:** `src/pages/patient/MyDetails.tsx`
- Line 13: Change default from `"profile"` to `"home"` so section defaults to home

**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Line 339-343 (`getInitialTab`): The mapping already handles `home` → `dashboard`. Verify SECTION_TABS has correct mappings. Currently `health: ["personal", "medical"]` — this correctly maps the "Profile" bottom nav (section="health") to personal/medical tabs
- The issue is that `section` prop defaults to `"profile"` in MyDetails which doesn't exist in SECTION_TABS. Fixing the default to `"home"` in MyDetails.tsx resolves this.

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Split fullName into firstName/lastName, add password eye toggle |
| `src/components/layout/TopBarIcons.tsx` | Add Share App item in avatar popover |
| `src/components/patients/PatientDetailsEditor.tsx` | Add inline edit pencil on section headings |
| `src/components/layout/BottomNav.tsx` | Default section to "home" |
| `src/pages/patient/MyDetails.tsx` | Default section to "home" |

