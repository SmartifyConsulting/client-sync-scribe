## Goals
1. Make the horizontal divider above the footer / sidebar account section run unbroken across the full viewport width (currently the sidebar's account-section top border and the footer's top border render at different y positions and don't visually connect).
2. Modernize the "selected tab" look on the inner/child screens that use Tabs (e.g. `ProvidersScreen`, hospital `IncomingAmbulancesScreen`, doctor `Invoices`, `Sessions`, `Patients`, `PatientCalendar`, `TodoList`, etc.) so the active state reads as polished and current, not a flat teal block.

## Out of scope
- Sidebar nav active-item styling (untouched).
- Design tokens, layout shell paddings, footer content/links.
- Any data, auth, or backend behaviour.

---

## Part A — Footer divider alignment

### Problem
In `src/components/layout/AppLayout.tsx`:
```tsx
<div className="hidden md:block md:ml-[var(--sidebar-width)]">
  <Footer />
</div>
```
`Footer` renders `<footer class="border-t border-border ...">`. Because the wrapper is offset by `ml-[var(--sidebar-width)]`, the border only spans the content column. Meanwhile `Sidebar` renders its account section with its own `border-t border-sidebar-border` at a different y-coordinate, so the two top-borders never line up.

### Fix
1. In `AppLayout.tsx`, drop the `md:ml-[var(--sidebar-width)]` wrapper so `<Footer />` is rendered full-width.
2. In `src/components/layout/Footer.tsx`, keep the `border-t border-border` on the `<footer>` (now spans full viewport) and shift the inner content container so legal links still sit in the content column:
   ```tsx
   <footer className="border-t border-border bg-card/50 py-6">
     <div className="md:ml-[var(--sidebar-width)]">
       <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-3"> ... </div>
     </div>
   </footer>
   ```
3. In `Sidebar.tsx`, remove the `border-t border-sidebar-border` on the account section wrapper (line ~176) so the only horizontal rule on the bottom strip is the footer's `border-t`, which now runs unbroken from x=0 to x=100vw across both sidebar and content.
4. Apply the equivalent change to `PatientAppLayout` / `ProviderSidebar`-using layouts if they have the same split (will confirm during build by reading those two files; if they already render `<Footer />` full-width, no change needed).

Result: one continuous `1px` divider across the whole screen, with the sidebar's avatar/Settings/Sign Out tucked just above it.

---

## Part B — Modernize child-screen tab styling

### Approach
Rather than touch every page individually, modernize the **default** `TabsList` / `TabsTrigger` in `src/components/ui/tabs.tsx` and then strip the per-page `bg-primary text-primary-foreground` / `data-[state=active]:bg-background data-[state=active]:text-foreground` overrides on the child screens so they inherit the new look.

### New default in `tabs.tsx`
- `TabsList`: `inline-flex h-10 items-center gap-1 rounded-full bg-muted/60 p-1 text-muted-foreground border border-border/60 backdrop-blur-sm` — pill container, subtle border, soft surface.
- `TabsTrigger`: `inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 text-muted-foreground hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_6px_rgba(45,176,166,0.18)] data-[state=active]:ring-1 data-[state=active]:ring-primary/20` — rounded pill, primary-tinted text + soft elevated shadow when active.

This gives a "macOS / Linear"-style segmented control with a clear, modern selected state in teal, while staying neutral when inactive.

### Per-page cleanup (remove obsolete overrides only)
For each of these files, delete the `className="bg-primary text-primary-foreground"` on `TabsList` and the `className="data-[state=active]:bg-background data-[state=active]:text-foreground"` on each `TabsTrigger`, so the new default applies:
- `src/modules/holarchelp/pages/provider/hospital/ProvidersScreen.tsx`
- `src/modules/holarchelp/pages/provider/hospital/IncomingAmbulancesScreen.tsx`
- `src/pages/doctor/Invoices.tsx`
- `src/pages/Sessions.tsx`
- `src/pages/SessionDetail.tsx`
- `src/pages/Patients.tsx`
- `src/pages/TodoList.tsx`
- `src/pages/CalendarView.tsx`
- `src/pages/patient/PatientCalendar.tsx`

Admin pages keep their underline variant (they don't use these overrides — they go through `adminTabsListClass` in `src/pages/admin/_shared/AdminTabs.tsx`, which I won't touch).

### Verification
- Visit `/provider/hospital/providers`, `/sessions`, `/patients`, `/calendar`, `/todos`, `/patient/calendar`, `/doctor/invoices` at 1296×1007 and 390×844; confirm:
  - The selected tab is a soft white pill with teal text and a gentle drop-shadow, not a hard teal block.
  - Inactive tabs are muted gray and lift to foreground on hover.
  - The footer divider runs unbroken across the sidebar + content area on every page.
- Spot-check `/admin` to confirm the admin underline tabs are unchanged.
- No console / build errors.
