

# Fix: Dynamic Doctor Search + Compact Invite Doctor Dialog + Calendar Sub-Heading

## 1. Make Doctor Search Dynamic (My Doctors Page)

**File:** `src/pages/patient/MyDoctors.tsx`

Add a `useEffect` with 300ms debounce on `searchQuery` — auto-triggers search when 2+ characters typed. Clears results when input is emptied.

## 2. Fix Calendar Sub-Heading Font Size

**File:** `src/pages/CalendarView.tsx` (line 251)

Change `<p className="mt-1 text-muted-foreground">` to `<p className="text-muted-foreground text-[12px]">`.

## 3. Compact Invite Doctor Dialog & Reduce Permission Font Sizes

**File:** `src/components/patient/InviteDoctorDialog.tsx`

- Reduce dialog gap/padding: change `gap-6 py-4` → `gap-3 py-2` on the main content wrapper (line 248)
- Reduce permission item padding: `p-3` → `p-2` (line 327)
- Reduce permission label: `text-sm font-medium` → `text-[10px] font-medium` (line 330) — ~30% smaller than current `text-sm` (~14px → ~10px)
- Reduce permission description: keep `text-xs` → `text-[8px]` (line 331) — ~30% smaller
- Reduce permission section description (line 324): `text-sm` → `text-[10px]`
- Reduce spacing between permission items: `space-y-3` → `space-y-2` (line 325)

## 4. Improve AI Todo Descriptions & Patient Matching

**File:** `supabase/functions/process-todo-actions/index.ts`

- Update AI system prompt to require date/time/patient name in description field
- Validate AI-returned `patient_id` exists in doctor's patient list; fall back to name-based fuzzy matching if invalid

## Files Modified

| File | Change |
|------|--------|
| `src/pages/patient/MyDoctors.tsx` | Add debounced auto-search |
| `src/pages/CalendarView.tsx` | Add `text-[12px]` to sub-heading |
| `src/components/patient/InviteDoctorDialog.tsx` | Compact layout, reduce permission font sizes by ~30% |
| `supabase/functions/process-todo-actions/index.ts` | Improve AI prompt; fix patient_id validation |

