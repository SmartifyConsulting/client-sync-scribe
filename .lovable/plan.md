

# Update Secondary Color, Remove MY RECORD Header, Restyle Alphabet Letter Breaks

## 1. Update Secondary Color (#E53935 → #E01837)

**`src/index.css`** — Update terracotta CSS variables to match `#E01837` (HSL ~351 81% 49%):
- Light: `--terracotta: 351 81% 49%`, light/dark variants adjusted
- Dark: slightly lifted for visibility

**`src/pages/Patients.tsx`** — Replace all 14 hardcoded `#E53935` references with `#E01837`.

## 2. Remove MY RECORD Header Row, Keep ME Row Highlighted

**`src/pages/Patients.tsx`** (lines 823–827):
- **Delete** the entire `<tr>` containing "MY RECORD" header
- Keep the ME row (line 828+) but change its background to `bg-gray-100 dark:bg-gray-800/20` (light grey highlight) — remove the left border accent
- The red "ME" circle badge is already intuitive enough on its own

## 3. Alphabet Letter Break Rows — Use #E01837 Background with White Font

**`src/pages/Patients.tsx`** (lines 886–902):
- Replace the rotating teal/amber/orange backgrounds with a single consistent style: `bg-[#E01837]`
- Change the letter text from `text-xs font-bold text-primary` to `text-xs font-bold text-white`

This gives each letter section header a bold red bar with white text, adding more of the secondary brand color throughout the patient list.

## Files Modified

| File | Change |
|------|--------|
| `src/index.css` | Update terracotta HSL to match #E01837 |
| `src/pages/Patients.tsx` | Remove MY RECORD row, grey ME highlight, red alphabet headers with white text, replace all #E53935 |

