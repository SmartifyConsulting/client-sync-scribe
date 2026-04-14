

# Plan: Introduce The Style Manifest

## What This Is

Codify the Style Manifest as a living reference document and apply an audit pass across the two layout shells and key shared components to fix current violations.

## 1. Create the Style Manifest reference file

**File:** `src/STYLE_MANIFEST.md` (new)

Store the full manifest text as a project-level reference so every future change can be checked against it. This has no runtime impact — it's a developer guideline.

## 2. Harmonize Doctor & Patient layout shells

**Files:** `src/components/layout/AppLayout.tsx`, `src/components/layout/PatientAppLayout.tsx`

Current inconsistencies to fix:

| Issue | Doctor (`AppLayout`) | Patient (`PatientAppLayout`) |
|-------|---------------------|------------------------------|
| Main content padding | `px-4 py-6 md:px-8` | Same ✓ |
| `max-w-7xl` centering | Present but missing `mx-auto` | Has `mx-auto` ✓ |
| Bottom padding (mobile) | `pb-24` | `pb-20` |
| Footer | Has `<Footer />` | Missing |
| `overflow-hidden` on root | Missing | Missing |

**Changes:**
- **AppLayout**: Add `mx-auto` to content container (line 53) for centering parity. Add `overflow-hidden` to root div.
- **PatientAppLayout**: Change `pb-20` → `pb-24` for consistent bottom-nav clearance. Add `overflow-hidden` to root div. Add `<Footer />` on desktop (hidden on mobile, same pattern as doctor).

## 3. Audit & fix text overflow protection

**Files:** Both layout shells + `src/components/dashboard/StatsCard.tsx`, `src/components/patients/PatientOverview.tsx`

Add `truncate` or `line-clamp-2` to patient/doctor names and long text fields that currently have no overflow protection. Add `overflow-hidden` to card containers where missing.

## 4. Ensure consistent touch targets on mobile

**Files:** `src/components/layout/BottomNav.tsx`, `src/components/layout/PatientAppLayout.tsx`

Audit all interactive elements (buttons, links) and ensure minimum `h-11` (44px) touch targets. The current bell/avatar buttons in PatientAppLayout use `h-9 w-9` (36px) — increase to `h-11 w-11`.

## 5. Replace fixed sidebar width references with a CSS variable

**Files:** `AppLayout.tsx`, `PatientAppLayout.tsx`, `Footer.tsx`

Currently `md:ml-[210px]` is hardcoded in multiple places. Create a Tailwind theme extension `--sidebar-width: 210px` and use `md:ml-[var(--sidebar-width)]` — or simply define a shared constant. This avoids magic numbers and makes future sidebar width changes a single edit.

## 6. Gap-over-margins audit

**Files:** `src/pages/Patients.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Sessions.tsx`

Scan for `mr-`, `ml-`, `mt-`, `mb-` used between sibling repeating elements and replace with parent `gap-{n}` where the manifest's Flexbox Rule applies.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/STYLE_MANIFEST.md` | New — reference document |
| `src/components/layout/AppLayout.tsx` | Add `mx-auto`, `overflow-hidden` |
| `src/components/layout/PatientAppLayout.tsx` | `pb-24`, `overflow-hidden`, add Footer, touch target fix |
| `src/components/layout/BottomNav.tsx` | Touch target audit |
| `src/components/dashboard/StatsCard.tsx` | `truncate` on text |
| `src/components/patients/PatientOverview.tsx` | `truncate`/`line-clamp` on names |
| `src/pages/Patients.tsx` | Gap-over-margins cleanup |
| `src/pages/Dashboard.tsx` | Gap-over-margins cleanup |
| `src/pages/Sessions.tsx` | Gap-over-margins cleanup |
| `tailwind.config.ts` | Add `--sidebar-width` variable |

