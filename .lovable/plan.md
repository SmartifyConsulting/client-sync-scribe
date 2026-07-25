## Fixes: Patients toast, My Sessions, My Practice accordions

### 1. Stop the "Patient added successfully" toast on My Patients

`src/pages/Patients.tsx` runs an effect that auto-creates a "ME" patient record for doctors who don't have one. This calls `createPatient` in `src/hooks/usePatients.ts`, which fires the generic success toast — so every fresh visit to My Patients pops the toast.

Fix:
- Add an `opts?: { silent?: boolean }` argument to `createPatient` in `src/hooks/usePatients.ts` and skip the success toast when `silent` is true. Preserve the error toast.
- In `src/pages/Patients.tsx` auto-ME effect (line 197), call `createPatient({...}, { silent: true })`. Manual "Add Patient" flow (line 334) continues to show the toast.

### 2. My Sessions screen heading

`src/pages/MySessions.tsx` currently renders the page title as `text-sm font-semibold`. Change it to match "My Holarprac" in `src/pages/MyPractice.tsx` (`text-3xl font-bold text-foreground`), with the subtitle kept as `text-muted-foreground text-xs`.

### 3. My Sessions accordion — only top row green by default

In `src/pages/MySessions.tsx`:
- Keep `defaultValue={["today"]}` (or the top group for the active grouping) so the first bucket is expanded on load.
- Default trigger state: white background, dark text, `hover:bg-muted` (light grey).
- Expanded (`data-[state=open]`): `bg-primary` with white text/chevron/count-pill.
- Add `pt-3` inside `AccordionContent` so the first session card has breathing room.
- Shrink the count badge to `px-1.5 py-0 text-[10px] min-w-5`. Open state: white pill with primary text. Closed: muted pill with muted-foreground text.

### 4. Session status badge — one size smaller

The status pill (Completed / In progress) currently uses `text-xs`. Drop it to `text-[10px]` while keeping `uppercase font-semibold px-2 py-0.5 rounded-full`.

### 5. Grouping toggle: Date vs Patient

Add a small segmented toggle above the accordion in `src/pages/MySessions.tsx` with two options: **Date** (default) and **Patient**. Use existing shadcn `ToggleGroup` (or `Tabs`) styled compactly (right-aligned next to the heading block).

Behaviour:
- **Date mode** — current buckets (Today / Last week / Last month / Older). Top bucket expanded by default.
- **Patient mode** — group `sessions` by `patient.name`; unknown/no patient becomes a "No patient" bucket. Sort groups alphabetically by surname (reuse the `getSurname` pattern already used in `src/pages/Patients.tsx`). Within each group, list sessions newest-first. The first group (alphabetically) is expanded by default.
- Same accordion styling rules from §3 apply in both modes. Toggle state lives in local component state (no persistence needed).

### 6. My Practice — About Me green by default

In `src/pages/MyPractice.tsx` `AboutMeAccordion` trigger:
- Make the trigger `bg-primary text-white` at all times (no `bg-transparent` default), with `hover:bg-primary/90`.
- Force the `h3`, Sparkles icon and chevron to white always.

### 7. Expanded accordion font → white (across My Practice)

Every `AccordionTrigger` in `src/pages/MyPractice.tsx` uses `[&_h3]:group-data-[state=open]:text-white [&_svg]:group-data-[state=open]:text-white`, which misses `<span>` labels (e.g. Service Offerings). Broaden each trigger's selector so all direct text turns white when open — add `data-[state=open]:[&_*]:text-white` (or explicit `[&_span]:group-data-[state=open]:text-white`). Apply to: Personal Information, Practice Information, Shared Practice Calendar, Service Offerings & Pricing, Digital Signature, Voice Narration Settings.

### 8. Service Offerings & Pricing font parity

Line 1868 uses `<span className="text-xs font-medium text-primary-dark">Service Offerings & Pricing</span>` while siblings use `<h3 className="text-base font-semibold text-primary-dark">`. Replace with the matching `<h3>` so it visually matches Digital Signature.

### Files
- `src/hooks/usePatients.ts` — silent flag on `createPatient`.
- `src/pages/Patients.tsx` — pass `{ silent: true }` in auto-ME effect.
- `src/pages/MySessions.tsx` — heading size, default-closed styling with green-when-open, content padding, smaller count pill, smaller status badge, Date/Patient grouping toggle.
- `src/pages/MyPractice.tsx` — About Me default-green trigger, Service Offerings h3, broaden open-state white-text selector across all triggers.
