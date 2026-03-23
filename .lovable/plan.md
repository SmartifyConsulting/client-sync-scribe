

# Plan: Move Color Assignment from Calendar to Pricing Tab

## What Changes

1. **Add `color` column to `service_prices` table** — a new migration adds an optional `color` text column (default `null`) to store the hex color for each service/appointment type.

2. **Remove "Manage Colors" from Calendar (`src/pages/CalendarView.tsx`)**:
   - Remove the `Palette` icon import and the entire color management dialog (lines 276-317)
   - Remove state variables: `typeColors`, `isColorDialogOpen`, `newColorType`, `newColorValue`
   - Remove functions: `addTypeColor`, `removeTypeColor`
   - Keep `getTypeColor` but rewrite it to fetch colors from `service_prices` instead of `appointment_type_colors`
   - The calendar still reads the color for each appointment type to render color-coded badges — it just fetches from `service_prices.color` now

3. **Add color picker to each service in Pricing tab (`src/pages/MyPractice.tsx`)**:
   - Add a small color circle/swatch next to each service row
   - When clicked, show a color input picker
   - On change, save the color to `service_prices.color` via Supabase
   - Show the color swatch in both view and edit modes
   - Also add a color field in the "Add New Service" form

4. **Calendar auto-colors**: When an appointment's `type` matches a `service_name` from `service_prices`, the calendar uses that service's `color`. No manual color management needed on the calendar page.

## Files Modified

| File | Change |
|------|--------|
| Migration SQL | Add `color` column to `service_prices`, migrate existing `appointment_type_colors` data |
| `src/pages/CalendarView.tsx` | Remove color dialog UI, fetch colors from `service_prices` instead |
| `src/pages/MyPractice.tsx` | Add color picker swatch to each service row in Pricing tab |

