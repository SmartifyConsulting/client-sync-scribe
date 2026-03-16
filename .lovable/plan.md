

# Fix "ME" Patient Visibility with Terracotta Styling

## Problems Found

1. **ME patient doesn't appear at top**: The `sortedPatients` array correctly moves ME to index 0, but the rendering loops through `availableLetters.sort()` and renders patients grouped by surname letter. So ME still appears buried under its surname letter (e.g., under "S" for Smith), not at the top.

2. **Colors**: The ME badge/avatar uses teal (`bg-primary`) instead of terracotta.

## Fix: `src/pages/Patients.tsx`

### Rendering: Show ME patient as a separate row before the alphabet groups

- Extract the ME patient from `sortedPatients` before grouping
- Render ME as a standalone highlighted row at the very top of the table body (before the letter groups)
- Remove ME from the grouped patients so they don't appear twice
- Style the ME row with terracotta background accent: `bg-terracotta/5` border, `bg-terracotta text-terracotta-foreground` avatar, `bg-terracotta/10 text-terracotta` badge

### Grouping logic change (lines 121-128):
- Check if first patient in `sortedPatients` is ME (`patient_user_id === user?.id`)
- If so, skip it when building `groupedPatients`
- Store reference to ME patient separately

### Render change (lines 611-619):
- Before the letter group loop, render the ME patient row with terracotta styling
- Add a subtle "MY RECORD" section header instead of a letter

### Avatar & badge styling (lines 629-641):
- Change from `bg-primary` to `bg-terracotta` for avatar
- Change badge from `bg-primary/10 text-primary` to `bg-terracotta/10 text-terracotta`

**Single file:** `src/pages/Patients.tsx`

