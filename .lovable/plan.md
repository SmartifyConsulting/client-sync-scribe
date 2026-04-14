

# Plan: Unified Login, Logo Fix, Patient Avatar, Button Layout, Replace Pricing with Services

## 1. Unified Login — Already implemented
The Auth.tsx already has role selection during signup (doctor/patient) and role-based redirects after login. No changes needed.

## 2. Fix Holarc logo aspect ratio on mobile
**File:** `src/components/layout/MobileHeader.tsx`

The logo uses `h-[50px] w-auto` which can distort. Add `object-contain` to preserve aspect ratio:
```
<img src={holarcLogo} alt="Holarc Health" className="h-[50px] w-auto object-contain" />
```

Also fix the PatientAppLayout mobile header logo (line 132) — already has `object-contain`, just verify sizing is consistent.

## 3. Add profile avatar (TopBarIcons) to patient tablet/web view
**File:** `src/components/layout/PatientAppLayout.tsx`

The doctor's `AppLayout` has a persistent `TopBarIcons` component on desktop (lines 50-52). The patient's `PatientAppLayout` is missing this. Add the same block inside `<main>`:
```tsx
<div className="hidden md:flex justify-end px-8 pt-4">
  <TopBarIcons />
</div>
```

## 4. Arrange Patients page buttons in 2x2 grid on mobile
**File:** `src/pages/Patients.tsx` (lines 397-421)

Change the button container from `flex gap-2 flex-wrap` to a 2-column grid on mobile:
```
className="grid grid-cols-2 md:flex gap-2 ml-auto"
```
This gives a 2x2 grid on mobile, and inline flex on tablet/desktop.

## 5. Remove Pricing Administration from My Practice, replace with Service Offerings & Pricing
**File:** `src/pages/MyPractice.tsx`

- **Remove** the "Pricing Administration" accordion (lines 1439-1450) which embeds `<PricingAdmin />`
- **Replace** it with a "Service Offerings & Pricing" accordion that embeds the existing service pricing UI (currently in the `TabsContent value="pricing"` section, lines 1698-1880)
- The accordion will use the same teal-border style, with a `DollarSign` icon and label "Service Offerings & Pricing"
- Remove the standalone `TabsContent value="pricing"` tab since it's now in the Practice accordion
- Remove `PricingAdmin` import (line 31)

This keeps the doctor's service/pricing management in My Practice while removing the admin-only Pricing Administration component.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/layout/MobileHeader.tsx` | Add `object-contain` to logo |
| `src/components/layout/PatientAppLayout.tsx` | Add `TopBarIcons` on desktop |
| `src/pages/Patients.tsx` | 2x2 grid for buttons on mobile |
| `src/pages/MyPractice.tsx` | Replace Pricing Admin accordion with Service Offerings accordion; remove pricing tab |

