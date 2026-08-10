---
name: HolarchStyling
description: Reference styling standard for the Holarc Health / proflow-ai app, derived from the "My Holarprac" screen (src/pages/MyPractice.tsx). Use this whenever styling, building, or auditing ANY screen in this app — screen headings, subtext, tab bars, sub-tab bars, or accordion/record card frames (e.g. Allergies, Medications, Conditions lists) — even if the user doesn't explicitly say "styling" or "design system". Also use it whenever the user says something "doesn't look consistent", asks to "match My Holarprac", or wants a new screen/section to "look like the rest of the app".
---

# HolarchStyling

This is the canonical styling reference for the Holarc Health app (repo: `proflow-ai`). Every pattern below is copied verbatim from the "My Holarprac" screen (`src/pages/MyPractice.tsx`), which is the reference screen the product owner designated as correct. When styling or auditing any screen, match these exact classNames — don't approximate or invent similar-looking values.

## How to use this skill

1. Identify which element type(s) the screen you're working on contains (heading, subtext, top-level tabs, sub-tabs, record/accordion cards).
2. Look up the matching pattern below and copy the `className` string exactly.
3. If an element on the screen you're auditing doesn't match, flag the diff and propose the exact replacement className — don't just say "make it more consistent."
4. If you hit a case not covered here (a new element type), don't guess — extend this document with the new pattern once it's agreed with the user, rather than silently inventing a one-off style.
5. **When auditing "the app" or "all screens", search the whole `src/` tree** — don't scope to `src/pages/` alone. Several screens live under `src/modules/holarchelp/` (a separate module directory, e.g. `MyShiftScreen.tsx`) and possibly other module folders. A directory-limited grep will silently miss these; confirm scope covers everywhere a route/page component can live before declaring an audit complete.

---

## 1. Screen heading

```jsx
<h1 className="text-3xl font-bold text-foreground">My Holarprac</h1>
```
- Size: `text-3xl` (30px) · Weight: `font-bold` · Color: `text-foreground` (`#333` light mode)
- No explicit margin — spacing comes from the parent flex/stack container, not the `<h1>` itself.
- **No eyebrow/label line above the `<h1>`.** Several screens (mainly under `src/modules/holarchelp/pages/provider/`) prepend an uppercase label like `<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hospital operations</p>` directly above the `<h1>`. This is NOT part of the standard — remove it. The `<h1>` should be the first element in the screen header, with the subtext (§2) as its only companion.

## 2. Screen subtext (below the heading)

```jsx
<p className="text-muted-foreground text-xs">Manage your personal and practice information</p>
```
- Size: `text-xs` · Weight: default/regular · Color: `text-muted-foreground` (`#666` light mode)
- Sits directly below the `<h1>` in normal block flow — no extra top margin.

## 3. Top-level screen tabs — WITH a nested sub-tab tier

```jsx
<TabsList className="flex w-full flex-nowrap overflow-x-auto bg-primary justify-start">
  <TabsTrigger
    value="practice"
    className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-base font-semibold px-3 py-1.5"
  >
    Practice
  </TabsTrigger>
  {/* ...more triggers */}
</TabsList>
```
- **Bar color:** `bg-primary` (brand teal/green) — reserved for a top-level tab bar where **at least one of its tabs' content contains a further nested sub-tab tier** (e.g. My Holarprac's "Rewards" tab embeds `MyRewards`, which has its own Overview/etc. sub-tabs). If a tab bar has no nested sub-tab tier anywhere beneath it, it does NOT get `bg-primary` — see the charcoal rule below.
- **Bar shape:** inherits `h-10 rounded-full p-1` from the base `TabsList` in `src/components/ui/tabs.tsx` — full height/width/shape is NOT overridden per-screen, only the background color is.
- **Trigger text:** `text-white` when inactive, flips to `data-[state=active]:bg-white data-[state=active]:text-black` when active.
- **Trigger font size:** `text-base font-semibold` — matches the accordion row heading size (§5), not a separate smaller tab-specific size. (Historically these were `text-xs`; that's now superseded — resize existing `text-xs` tab triggers to `text-base font-semibold` when you touch them.)
- **Trigger padding:** fixed `px-3 py-1.5` (not responsive) at the top level.

## 4. Sub-tabs (e.g. My Holarprac → Rewards) AND tab bars with no sub-tab tier at all — charcoal

```jsx
<TabsList className="bg-neutral-600 flex w-full flex-nowrap overflow-x-auto justify-start">
  <TabsTrigger
    value="overview"
    className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-base font-semibold px-1.5 py-1 sm:px-3 sm:py-1.5"
  >
    Overview
  </TabsTrigger>
</TabsList>
```
`bg-neutral-600` (charcoal) applies in TWO cases:
1. **Genuine nested sub-tabs** — a tab bar rendered inside another tab's content (e.g. Rewards' Overview/etc.).
2. **A tab bar with no sub-tab tier anywhere in the screen** — if a screen's only tab bar doesn't lead to any further nested tabs, it is NOT a "top-level tab bar with children" in the §3 sense, so it takes the charcoal treatment too, not green. (Most screens fall in this bucket — green `bg-primary` is the exception for screens that actually nest a further tab tier, not the default.)
- **Trigger font size:** same as §3 — `text-base font-semibold`, matching accordion row headings. (Historically `text-xs`; supersede on touch.)
- **Trigger padding:** responsive — smaller on mobile (`px-1.5 py-1`), stepping up at `sm:` (`sm:px-3 sm:py-1.5`).

### Flat tab-content panel titles (not the tab pill itself, not an accordion) — also charcoal

Some tabs render a flat content panel with its own `<h3>` title but no accordion/collapsible behavior and no sub-tabs (e.g. My Holarprac's "Referral Doctors" and "Credentials" tabs). These panel titles currently reuse the accordion heading class (`text-base font-semibold text-primary-dark`, §5) — that green color is reserved for genuine accordion rows. Flat panel titles should use charcoal instead:
```jsx
<h3 className="text-base font-semibold text-neutral-600">Referral Doctors</h3>
```
Same size/weight as an accordion heading (`text-base font-semibold`), but `text-neutral-600` (charcoal, the same value as the sub-tab bar background) instead of `text-primary-dark` (green) — green stays reserved for content that actually expands/collapses (§5) or genuinely nests further tabs (§3).

## 5. Accordion lists (grouped settings sections — the My Holarprac "Practice" tab pattern)

This is the top-level accordion list pattern, e.g. My Holarprac's "About Me" / "Personal Information" / "Practice Information" rows. Use this for any grouped-settings-style accordion list (My Tasks, and similar screens elsewhere in the app, should also use this exact structure):

```jsx
<div className="rounded-xl border border-neutral-400 bg-white shadow-sm overflow-hidden">
  <Accordion type="multiple" className="divide-y divide-white">
    <AccordionItem value="about-me" className="border-0">
      <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold text-primary-dark">About Me</h3>
        </div>
      </AccordionTrigger>
      <AccordionContent className={SECTION_CONTENT_CLASS}>
        {/* row content */}
      </AccordionContent>
    </AccordionItem>
    {/* more AccordionItems, same shape */}
  </Accordion>
</div>
```
- **Frame:** `rounded-xl border border-neutral-400 bg-white shadow-sm overflow-hidden` on the outer wrapper `<div>`; `divide-y divide-white` on the `Accordion` itself.
- **Item:** `className="border-0"` on every `AccordionItem`.
- **Trigger:** `SECTION_TRIGGER_ALWAYS_GREEN_CLASS` from `src/components/ui/section-accordion.tsx` — always green background, white text, in both open and closed states.
- **Row heading:** `<h3 className="text-base font-semibold text-primary-dark">` — this is also the reference size for tab headings (§3/§4) and the size sub-accordion headings must match (§6).
- **Content:** `SECTION_CONTENT_CLASS` = `"px-4 pt-3 pb-3 space-y-2"`.

**Known deviation to fix wherever found:** My Tasks (`src/pages/patient/PatientTasks.tsx`) uses its own hand-rolled `Collapsible`/`SectionHeader` combo instead of this pattern — wrong row height (`px-4 py-3` vs. the trigger's `px-4 py-2`), wrong heading size (`text-xs` vs. `text-base`), and wrong content padding (`p-3` vs. `px-4 pt-3 pb-3 space-y-2`). Any screen doing this — building its own accordion instead of reusing `SECTION_*` — should be converted to the pattern above.

## 6. Sub-accordions (an accordion nested inside another accordion's content — the Practice Information pattern)

Reference: My Holarprac's "Practice Information" row expands to reveal a second, nested accordion (Practice Details / Partners / etc.):

```jsx
<Accordion type="multiple" className="rounded-xl border border-primary bg-white overflow-hidden divide-y divide-primary">
  <AccordionItem value="partners" className={SECTION_ITEM_CLASS}>
    <AccordionTrigger className={SECTION_TRIGGER_CLASS}>
      <h4 className="text-base font-semibold">Partners</h4>
    </AccordionTrigger>
    <AccordionContent className={SECTION_CONTENT_CLASS}>
      {/* row content */}
    </AccordionContent>
  </AccordionItem>
</Accordion>
```
- **Frame:** `rounded-xl border border-primary bg-white overflow-hidden divide-y divide-primary` (note: `border-primary`/`divide-primary`, not the `border-neutral-400`/`divide-white` used by the top-level frame in §5 — this is what visually signals "nested level").
- **Item:** `SECTION_ITEM_CLASS` = `"border-0 rounded-none bg-card"`.
- **Trigger:** `SECTION_TRIGGER_CLASS` (the toggle variant — transparent at rest, turns green only when the row is actually open). **Do not hand-roll a one-off trigger className that hardcodes a background color at rest** (e.g. `!bg-neutral-400`) — that's the "always-grey-highlighted top row" bug found on My Holarprac's own "Practice Details" row and must be fixed to use `SECTION_TRIGGER_CLASS` like every other sub-accordion row.
- **Row heading:** `<h4 className="text-base font-semibold">` — same `text-base font-semibold` size as the top-level accordion heading in §5 (previously these were incorrectly smaller at `text-sm`; always match the top-level size, don't scale sub-rows down).

## 7. Accordion / record card frames (Allergies, Medications, Conditions, Chronic Medications, etc.)

```jsx
<Collapsible className="rounded-xl border border-primary bg-card p-5">
  {/* heading trigger + list content */}
</Collapsible>
```
- Shape: `rounded-xl`, `p-5` padding — consistent across every record-card, regardless of topic.
- Border + fill: `border-primary` (brand color border) + `bg-card` (white fill) is the default/neutral card.
- **Semantic exception:** cards representing a warning/danger state (e.g. Allergies) swap the border+fill pair but keep the same shape:
  ```jsx
  <Collapsible className="rounded-xl border border-red-500/30 bg-red-500/5 p-5">
  ```
  This is not an inconsistency to "fix" — it's the intended pattern for danger-toned cards. Only the color pair changes; radius and padding never do.

This is a THIRD, distinct frame system from §5/§6 — don't mix them:
- Use §7 (`border-primary bg-card p-5`) for patient clinical record lists (Allergies/Medications/Conditions-style content).
- Use §5's frame (`border-neutral-400 bg-white`) for the top-level grouped-settings accordion list AND for static header-bar list panels — a title bar row plus a plain (non-collapsible) `divide-y` list, e.g. "Upcoming shifts" / "My patients" on My Shift (`src/modules/holarchelp/pages/provider/hospital/MyShiftScreen.tsx`).
- Use §6's frame (`border-primary bg-white divide-primary`) specifically for a sub-accordion nested inside a §5 accordion's content.

---

## Underlying design tokens

Reference these when a screen needs a value not directly covered by the patterns above — always prefer a semantic token over a raw color unless deliberately building a tab/frame-bar element (see note below).

| Token | Tailwind class | Light mode value |
|---|---|---|
| Foreground text | `text-foreground` | `#333` |
| Muted/secondary text | `text-muted-foreground` | `#666` |
| Card fill | `bg-card` | `#FFF` |
| Muted surface (hover, etc.) | `bg-muted` | `#F5F5F5` |
| Border | `border-border` | `#E0E0E0` |
| Brand primary | `bg-primary` / `text-primary` | brand teal/green |
| Card radius | `rounded-xl` | `calc(var(--radius) + 4px)` |

**Deliberate non-token colors:** `bg-neutral-600` / `text-neutral-600` (charcoal), `border-neutral-400`, `bg-white`, `text-white`, `text-black` are used on purpose in the tab-bar and section-frame system above, instead of the semantic tokens. This is an intentional, established exception — don't "fix" these to use `bg-primary`/`text-foreground` etc., and don't invent new raw-color usages elsewhere by analogy without checking this doc first.

---

## Scope: this applies to the WHOLE app, every module and every profile

This skill is not limited to patient/doctor screens under `src/pages/`. It applies equally to every profile's screen set, including:
- `src/pages/patient/*`, `src/pages/doctor/*`, `src/pages/admin/*`, `src/pages/practice/*`
- `src/modules/holarchelp/pages/*` (HolarcHelp end-user emergency screens)
- `src/modules/holarchelp/pages/provider/*` (dispatcher/console screens)
- `src/modules/holarchelp/pages/provider/hospital/*` (hospital-ops profile)
- `src/modules/holarchelp/pages/provider/ambulance/*` (ambulance/EMS-crew profile)

When asked to audit "the app" or apply this skill broadly, search the ENTIRE `src/` tree for each element type (grep for `<h1`, `TabsList`, `TabsTrigger`, `AccordionTrigger`, `Collapsible`) rather than a fixed directory list — new module/profile directories can appear over time, and a stale scope list is how deviations get missed (this happened once already with My Shift, which lives under `src/modules/holarchelp/` and was skipped by a `src/pages/`-only audit).

---

## Quick audit checklist

When styling or reviewing a screen, check each element type present against this list:

- [ ] Screen heading matches `text-3xl font-bold text-foreground` exactly, with no eyebrow/label line above it
- [ ] Screen subtext matches `text-muted-foreground text-xs` exactly
- [ ] Tab bars use `bg-primary` ONLY if they have a genuine nested sub-tab tier beneath them; otherwise `bg-neutral-600` (charcoal), even if it's the screen's only/top-level tab bar
- [ ] All tab trigger labels (top-level and sub-tab) use `text-base font-semibold`, matching accordion row heading size — not `text-xs`
- [ ] Flat tab-content panel titles (no accordion, no sub-tabs) use `text-base font-semibold text-neutral-600` (charcoal), not `text-primary-dark` (green) — green is reserved for genuine accordion rows
- [ ] Grouped-settings accordion lists use the §5 pattern (`SECTION_TRIGGER_ALWAYS_GREEN_CLASS`, `text-base font-semibold text-primary-dark` heading, `SECTION_CONTENT_CLASS`) — not a hand-rolled Collapsible/SectionHeader combo
- [ ] Sub-accordions (nested inside another accordion) use the §6 pattern (`SECTION_TRIGGER_CLASS`, `border-primary` frame, `text-base font-semibold` heading matching the parent's size) — no hardcoded at-rest background color on the trigger, and no smaller heading size than the parent accordion
- [ ] Clinical record/accordion cards use `rounded-xl border border-primary bg-card p-5` (or the red-tinted danger variant where semantically appropriate)
- [ ] No raw/arbitrary colors introduced where a token or an established pattern above already covers the case
