

# Updated Plan: Vulas Counter, Edit Button Repositioning, Profile Banner Changes, Landing & Footer Fixes

## All previous plan items remain (PatientAppLayout, routing, Settings tab, rewards recoloring, back-to-home, Vula logo asset, remove nav). This plan adds the following edits:

## New Changes

### 1. Animated Vulas counter above Vula Vouchers logo (`MyDetails.tsx`)
- Fetch vulas balance using `useMyRewards()` hook (returns `lollipopCount`)
- Display the count just above the Vula Vouchers logo on the right side of the heading row
- Implement an animated counter that counts up from 0 to the actual value over ~1.5 seconds using a `useEffect` with `requestAnimationFrame` or interval-based easing
- Style: bold number with a small "Vulas" label, e.g. "127 Vulas" in the Vula blue-teal color

### 2. Move Edit button off the tab bar (`PatientDetailsEditor.tsx`)
- **View mode** (line 773): Remove the `<Button>Edit</Button>` from inside the `<TabsList>`
- Place it below the tab bar, right-aligned (`flex justify-end mt-2`), before the `<TabsContent>` blocks
- **Edit mode** (line 1159-1163): Same treatment for the Done/Saving indicators — move them below the tab bar, right-aligned

### 3. Profile banner: "Welcome back" + patient name, hide email, show holarc email (`PatientDetailsEditor.tsx` lines 673-676)
- Change the banner text from just showing the patient name to:
  - Line 1: "Welcome back" (smaller text, muted)
  - Line 2: Patient full name (bold, larger)
- Hide the real email address
- Generate and display a Holarc email address derived from patient name: `firstname.lastname@holarc.health` (lowercase, no spaces)

### 4. Remove duplicate footer on Landing page (`Landing.tsx`)
- Remove lines 317-322 (the inline `<footer>` block) — keep only the `<Footer />` component on line 359

### 5. Move logo above "One Ecosystem" on Landing hero (`Landing.tsx`)
- Move the `<motion.div>` containing the logo image (lines 147-154) above the `<h1>` (line 142)
- Replace `holarcLogo` import with the new clear-background logo asset (`holarc-logo-clear.png`)

### 6. Remove centered logo from MyDetails, increase top-bar logo size
- Remove lines 89-92 in `MyDetails.tsx` (the centered logo div)
- In `PatientAppLayout.tsx`, change top-bar logo from `h-8` to `h-11` (35% larger)

## Technical Summary

| File | Change |
|------|--------|
| `src/pages/patient/MyDetails.tsx` | Add animated Vulas counter above Vula logo; remove centered logo |
| `src/components/patients/PatientDetailsEditor.tsx` | Move Edit/Done buttons below tab bar, right-aligned; ProfileBanner shows "Welcome back" + name + holarc email |
| `src/pages/Landing.tsx` | Remove inline footer; move logo above heading; use clear-background logo |
| `src/components/layout/PatientAppLayout.tsx` | Increase logo to `h-11` |
| `src/assets/holarc-logo-clear.png` | New asset from uploaded image |

