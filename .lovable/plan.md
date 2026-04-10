

# Vula Icon Fix, Rename Partner Apps, Transfer Button on Transferred Card

## 1. Replace green Ⓜ icon with Vula symbol in Recent Rewards

**Files:** `src/pages/patient/MyRewards.tsx`, `src/pages/doctor/DoctorRewards.tsx`

Replace all `<span className="text-2xl font-bold text-emerald-600">Ⓜ</span>` in the Recent Rewards section (and the empty state) with `<img src={vulaSymbol} alt="Vula" className="h-7 w-7 object-contain" />`. The `vulaSymbol` import already exists in both files.

Affected lines:
- Patient: lines 439, 447 (empty state big icon and per-reward icon)
- Doctor: lines 198, 206

## 2. Rename "Vula Apps" to "Vula Partner Apps"

**Files:** `src/pages/patient/MyRewards.tsx`, `src/pages/doctor/DoctorRewards.tsx`

- Tab trigger label: change `Vula Apps` → `Vula Partner Apps` (patient line 395, doctor line 172)
- Card title inside the tab content: change `Vula Apps` → `Vula Partner Apps` (patient line 776, doctor line 352)

## 3. Add "Transfer Vulas" button on the Transferred stats card

**Files:** `src/pages/patient/MyRewards.tsx`, `src/pages/doctor/DoctorRewards.tsx`

Add a small `Transfer Vulas` button inside the Transferred card (the sky/cyan gradient card). This button opens the same `showTransferDialog` dialog that already exists. Place it below the transferred amount as a compact link-style button.

The existing "Transfer Vulas" button at the top-right (conditionally shown when partner apps exist) can remain as-is for quick access; the card button provides a second entry point.

## Technical Summary

| File | Change |
|------|--------|
| `src/pages/patient/MyRewards.tsx` | Replace Ⓜ with vulaSymbol img in Recent Rewards; rename tab/title to "Vula Partner Apps"; add Transfer button to Transferred card |
| `src/pages/doctor/DoctorRewards.tsx` | Same three changes |

No database migration needed.

