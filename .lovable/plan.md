

# Plan: Vulas explainer copy refresh + home page logo sizing

## 1. Update the Vulas explainer dialog

**File:** `src/components/rewards/VulaExplainerDialog.tsx`

- **Remove the hero illustration** (`vula-explainer.png`) currently rendered at the top of the gradient hero.
- **Replace** it with the official **Vula Vouchers logo** (`@/assets/vula-vouchers-logo-v2.png` — the same file already used on the rewards screens) so the launch dialog matches the rest of the rewards UI.
- **Rewrite the body copy** to the new text (no bullet rows, no "Sparkles/TrendingUp" icons — just clean paragraphs):
  > Vula means rain in isiZulu and isiXhosa — something you can't always predict, but always need.
  >
  > Vulas reward real-world actions — caring, helping, sharing, contributing, and following through.
  >
  > It's how we show up for each other.
  >
  > The way we earn and exchange value is changing.
  >
  > Vulas are a simple way to start building value that grows with you.
- **Add a tagline strip** above the CTA: *"Earn them. Use them. Keep them."* (centered, small, bold, gradient text matching the blue→teal brand).
- Keep the existing **"Earn Vulas"** gradient CTA button at the bottom and the close (×) control.
- Drop the now-unused `Sparkles` and `TrendingUp` lucide imports and the `vula-explainer.png` import.

## 2. Patient Home — Vula logo sizing

**File:** `src/components/patients/PatientDetailsEditor.tsx`

- **Mobile (line 1142):** reduce the inline Vula Vouchers logo by ~40% — change `h-[72px]` → `h-[44px]` so it sits proportionally next to the count without dominating the row.
- **Tablet/web (lines 1089–1097):** the logo currently sits in `items-center justify-center` inside the top flex row, which aligns it with the avatar. Adjust so it aligns with the **middle of the "Here's what's happening today" subtitle** (the second line of the greeting block):
  - Change the wrapper from `hidden md:flex items-center justify-center gap-3` → `hidden md:flex items-end gap-3 pb-1` and keep `h-12` on the logo.
  - The `items-end` + small bottom padding lines the logo's vertical center up with the lower subtitle line rather than the bold greeting above it.

## Files touched
| File | Change |
|---|---|
| `src/components/rewards/VulaExplainerDialog.tsx` | Swap hero image for `vula-vouchers-logo-v2.png`, replace body copy with the new 5-paragraph text, add "Earn them. Use them. Keep them." tagline above CTA, remove unused icons/import |
| `src/components/patients/PatientDetailsEditor.tsx` | Mobile Vula logo `h-[72px]` → `h-[44px]`; tablet/web Vula wrapper switched to `items-end pb-1` so logo aligns with the subtitle line |

## Out of scope
- Rewards-page header logos (already correctly sized).
- The `vula-explainer.png` asset stays on disk (no deletion) in case it's reused later.
- No changes to the localStorage first-launch logic — dialog still auto-opens once and is reopenable from the header.

