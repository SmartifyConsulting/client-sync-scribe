

# Plan: Calendar Color Codes, Red Color Unification, Appointment Modal Redesign & Session Fix

## 1. Unify all red colors to #C0252F

**File:** `src/index.css`

`#C0252F` in HSL is approximately `356 67% 42%`. Update:
- `--terracotta` (light mode): `356 67% 42%` (currently `351 81% 49%`)
- `--terracotta-light`: `356 67% 52%`
- `--terracotta-dark`: `356 67% 32%`
- `--destructive` (light mode): `356 67% 42%` (currently `0 84% 60%`)
- Same updates for dark mode variants

This makes calendar icon, mic, bell, destructive buttons, and logo accents all use `#C0252F`.

## 2. Calendar icon color — use terracotta instead of destructive

**File:** `src/components/layout/TopBarIcons.tsx` (line 96)
Change `bg-destructive` → `bg-terracotta` and `hover:bg-destructive/80` → `hover:bg-terracotta-dark` so all three icons (calendar, mic, bell) use the same terracotta color.

**File:** `src/components/layout/PatientAppLayout.tsx` (line 175)
Same change for mobile header calendar icon.

## 3. Google Calendar icon — remove border, enlarge 60%

**File:** `src/pages/CalendarView.tsx` (line 290-301)
- Remove `variant="outline"` → use `variant="ghost"` (removes border)
- Change logo `className="h-6 w-auto"` → `className="h-10 w-auto"` (60% increase)

## 4. Rename "+ New Appointment" to "+ Book"

**File:** `src/pages/CalendarView.tsx` (line 306-309)
Change button text from `New Appointment` to `Book`.

**File:** `src/pages/patient/PatientCalendar.tsx`
Verify the patient calendar also has a `+ Book` button (it already has BookAppointmentDialog, just rename label if needed).

## 5. Show appointment color codes on calendar entries

**File:** `src/pages/CalendarView.tsx`

Currently `getTypeColor()` returns a color from `serviceColors` but only uses it for initials badges (line 570). The calendar entry background still uses hardcoded type classes (`bg-primary/20`, `bg-warning/20`).

Fix: When `getTypeColor(event.type)` returns a service color, use it as inline `style={{ backgroundColor }}` with opacity instead of the hardcoded classes. Apply to:
- Month view entries (line 559-564)
- Week view entries (line 484)
- Today's Schedule type badge (line 690-694)

Also fix event type mapping (line 164): currently maps all non-followup, non-internal to "session". Instead, preserve the actual `apt.type` value so service-specific colors work:
```tsx
type: apt.type || "session",
```

## 6. Fix missing "End Recording" on mobile session view

**File:** `src/pages/Sessions.tsx` (lines 787-946)

The recording panel is in the second column (`order-2`) of the grid layout. On mobile (`grid-cols-1`), it renders AFTER the notes tab which takes up significant height. The "End Session" button at the bottom may be pushed off-screen.

Fix: On mobile, move the recording panel to appear FIRST (before notes) by changing `order-2 lg:order-2` to `order-1 lg:order-2` on the recording panel div (line 822), and the notes panel from `order-2 lg:order-1` to `order-2 lg:order-1` (already correct — line 790 says `order-2 lg:order-1`). Wait — currently the recording panel IS `order-2 lg:order-2` and notes is `order-2 lg:order-1`. Fix: recording panel should be `order-1 lg:order-2` so it shows first on mobile.

## 7. Redesign appointment detail modal

**File:** `src/pages/CalendarView.tsx` (lines 708-879)

Replace the current modal with a redesigned version:

**Header:** Appointment type as heading (e.g., "General Consultation"), patient full name as a clickable link (navigates to `/patients/{patientId}`), and date/time below.

**Actions:**
- **Mobile:** Three icon-only buttons in a row — Pencil (edit), Trash (delete), Green Play (start session)
- **Tablet/Desktop:** Full text buttons — "Edit", "Delete" (destructive), "Start Session" (green)

```tsx
<DialogHeader>
  <DialogTitle>{getEventTypeLabel(selectedEvent.type)}</DialogTitle>
  <DialogDescription>
    <Link to={`/patients/${selectedEvent.patientId}`} className="text-primary hover:underline font-medium">
      {patientName}
    </Link>
    <span className="block text-muted-foreground">
      {month} {day}, {year} · {time}
    </span>
  </DialogDescription>
</DialogHeader>

{/* Mobile: icon buttons */}
<div className="flex md:hidden gap-3 justify-center pt-4">
  <Button variant="outline" size="icon" onClick={edit}><Pencil /></Button>
  <Button variant="destructive" size="icon" onClick={delete}><Trash2 /></Button>
  <Button size="icon" className="bg-green-600 hover:bg-green-700"><Play /></Button>
</div>

{/* Desktop: text buttons */}
<div className="hidden md:grid grid-cols-3 gap-2 pt-4">
  <Button variant="outline">Edit</Button>
  <Button variant="destructive">Delete</Button>
  <Button className="bg-green-600 hover:bg-green-700">Start Session</Button>
</div>
```

Notes and location info remain between header and action buttons.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/index.css` | Unify terracotta + destructive to #C0252F |
| `src/components/layout/TopBarIcons.tsx` | Calendar icon uses terracotta |
| `src/components/layout/PatientAppLayout.tsx` | Calendar icon uses terracotta |
| `src/pages/CalendarView.tsx` | Color-coded entries, Google Cal logo border/size, rename +Book, redesign modal, preserve event type |
| `src/pages/Sessions.tsx` | Fix recording panel order on mobile |
| `src/pages/patient/PatientCalendar.tsx` | Rename button to +Book if needed |

