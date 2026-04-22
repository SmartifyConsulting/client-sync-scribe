

# Plan: Patient web/tablet nav consolidation, mobile greeting de-dupe, logo sizing

## 1. Web/Tablet sidebar — merge "My Calendar" + "To-Do List" into "My Desk"

**File:** `src/components/layout/Sidebar.tsx` (lines 39–45, `patientNavItems`)

Replace the two separate entries with a single `My Desk` link that opens the existing admin section (which already groups Calendar + Tasks + Documents):

```tsx
const patientNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Home",       to: "/patient/details?section=home" },
  { icon: User,            label: "My Profile", to: "/patient/details?section=health" },
  { icon: FolderOpen,      label: "My Desk",    to: "/patient/details?section=admin" },
  { icon: Gift,            label: "My Rewards", to: "/patient/rewards" },
];
```

(Add `FolderOpen` to the lucide imports; drop unused `Calendar` / `CheckSquare` imports.)

This reuses the existing `admin` section already wired in `SECTION_TABS` (`["calendar", "tasks", "documents"]` — `PatientDetailsEditor.tsx:316`) and matches the mobile bottom nav, which already uses "My Desk" for the same destination. No routing changes needed; no duplicate work for tasks/calendar pages — they remain accessible as tabs inside My Desk.

Mobile bottom nav is unchanged (already correct: 5 items including My Desk).

## 2. Mobile patient Home — remove duplicate "Good evening, Sara"

**File:** `src/components/patients/PatientDetailsEditor.tsx` (lines 1138–1157)

The mobile Home banner currently renders the greeting **twice**: once at the top (lines 1078–1084) and again inside the mobile-only Vula Vouchers row (lines 1142–1148).

Fix: in the mobile Vula row, drop the greeting span and keep only the Vula logo + count, right-aligned. The existing top greeting (line 1078) stays as the single source of truth.

```tsx
{/* Row 3: Vula Vouchers - mobile only */}
{!rewardsLoading && lollipopCount !== undefined && (
  <div className="mt-3 border-t border-border pt-3 md:hidden">
    <div className="flex items-center justify-end gap-2">
      <img src={vulaVouchersLogo} alt="Vula Vouchers" className="h-[72px] w-auto object-contain" />
      <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">
        <AnimatedCounter target={lollipopCount} />
      </span>
    </div>
  </div>
)}
```

## 3. Logo sizing — fit inside mobile + tablet/web frames

The logos currently overflow / look oversized:

- **Mobile header** (`src/components/layout/PatientAppLayout.tsx:134`): `h-[62px]` — too tall for the 56–64px header bar; reduce to `h-10` (40px) with `object-contain`.
- **Doctor mobile header** (`src/components/layout/MobileHeader.tsx`): currently `h-[50px]` — reduce to `h-10` for parity.
- **Sidebar (tablet/web)** (`src/components/layout/Sidebar.tsx:97`): `h-[62px]` inside an `h-20` (80px) row — reduce to `h-12` (48px) `object-contain` so it sits comfortably inside the 80px header without stretching the 210px-wide sidebar frame.

All three changes preserve aspect ratio via `w-auto object-contain` (already present) — only the height drops.

## Files touched
| File | Change |
|---|---|
| `src/components/layout/Sidebar.tsx` | Merge Calendar + Tasks → "My Desk"; logo `h-[62px]` → `h-12` |
| `src/components/layout/PatientAppLayout.tsx` | Mobile header logo `h-[62px]` → `h-10` |
| `src/components/layout/MobileHeader.tsx` | Doctor mobile header logo `h-[50px]` → `h-10` |
| `src/components/patients/PatientDetailsEditor.tsx` | Remove duplicate greeting in mobile Vula row (lines 1142–1148) |

## Out of scope
- Doctor sidebar items (already 5, no calendar/tasks duplication).
- Web/tablet greeting (only one instance, no change needed).
- Bottom nav (already shows "My Desk").

