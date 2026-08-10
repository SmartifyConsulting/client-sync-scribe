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

---

## 1. Screen heading

```jsx
<h1 className="text-3xl font-bold text-foreground">My Holarprac</h1>
```
- Size: `text-3xl` (30px) · Weight: `font-bold` · Color: `text-foreground` (`#333` light mode)
- No explicit margin — spacing comes from the parent flex/stack container, not the `<h1>` itself.

## 2. Screen subtext (below the heading)

```jsx
<p className="text-muted-foreground text-xs">Manage your personal and practice information</p>
```
- Size: `text-xs` · Weight: default/regular · Color: `text-muted-foreground` (`#666` light mode)
- Sits directly below the `<h1>` in normal block flow — no extra top margin.

## 3. Top-level screen tabs

```jsx
<TabsList className="flex w-full flex-nowrap overflow-x-auto bg-primary justify-start">
  <TabsTrigger
    value="practice"
    className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-3 py-1.5"
  >
    Practice
  </TabsTrigger>
  {/* ...more triggers */}
</TabsList>
```
- **Bar color:** `bg-primary` (brand teal/green) — this is what makes it a *top-level* tab row, distinct from sub-tabs (see §4).
- **Bar shape:** inherits `h-10 rounded-full p-1` from the base `TabsList` in `src/components/ui/tabs.tsx` — full height/width/shape is NOT overridden per-screen, only the background color is.
- **Trigger text:** `text-xs`, `text-white` when inactive, flips to `data-[state=active]:bg-white data-[state=active]:text-black` when active.
- **Trigger padding:** fixed `px-3 py-1.5` (not responsive) at the top level.

## 4. Sub-tabs (e.g. My Holarprac → Rewards)

```jsx
<TabsList className="bg-neutral-600 flex w-full flex-nowrap overflow-x-auto justify-start">
  <TabsTrigger
    value="overview"
    className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-1.5 py-1 sm:text-xs sm:px-3 sm:py-1.5"
  >
    Overview
  </TabsTrigger>
</TabsList>
```
Same active/inactive color logic as top-level tabs, but with two deliberate differences that signal "this is a nested level, not the top":
- **Bar color:** `bg-neutral-600` (grey) instead of `bg-primary` (brand color). This is the visual cue that separates a sub-tab row from a top-level tab row — don't use `bg-primary` for a nested tab bar, and don't use `bg-neutral-600` for a top-level one.
- **Trigger padding:** responsive — smaller on mobile (`px-1.5 py-1`), stepping up at `sm:` (`sm:px-3 sm:py-1.5`), rather than the fixed padding used at the top level.

## 5. Accordion / record card frames (Allergies, Medications, Conditions, Chronic Medications, etc.)

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

There's a second, unrelated grey-frame pattern used for other accordion groupings (e.g. Practice Information sub-sections on My Holarprac itself), defined as `SECTION_FRAME_CLASS` in `src/components/ui/section-accordion.tsx`:
```
rounded-xl border border-neutral-400 bg-white overflow-hidden divide-y divide-white
```
Use the `border-primary`/`bg-card` record-card pattern (above) for patient clinical record lists (Allergies/Medications/Conditions-style content). Use the `section-accordion.tsx` grey-frame pattern only for the kind of grouped-settings accordions it's already used for elsewhere (e.g. Practice Information) — don't mix the two for the same purpose.

---

## Underlying design tokens

Reference these when a screen needs a value not directly covered by the 5 patterns above — always prefer a semantic token over a raw color unless deliberately building a tab/frame-bar element (see note below).

| Token | Tailwind class | Light mode value |
|---|---|---|
| Foreground text | `text-foreground` | `#333` |
| Muted/secondary text | `text-muted-foreground` | `#666` |
| Card fill | `bg-card` | `#FFF` |
| Muted surface (hover, etc.) | `bg-muted` | `#F5F5F5` |
| Border | `border-border` | `#E0E0E0` |
| Brand primary | `bg-primary` / `text-primary` | brand teal/green |
| Card radius | `rounded-xl` | `calc(var(--radius) + 4px)` |

**Deliberate non-token colors:** `bg-neutral-600`, `border-neutral-400`, `bg-white`, `text-white`, `text-black` are used on purpose in the tab-bar and section-frame system above, instead of the semantic tokens. This is an intentional, established exception — don't "fix" these to use `bg-primary`/`text-foreground` etc., and don't invent new raw-color usages elsewhere by analogy without checking this doc first.

---

## Quick audit checklist

When styling or reviewing a screen, check each element type present against this list:

- [ ] Screen heading matches `text-3xl font-bold text-foreground` exactly
- [ ] Screen subtext matches `text-muted-foreground text-xs` exactly
- [ ] Top-level tabs use `bg-primary` bar + `text-xs` white/black-on-white triggers with fixed `px-3 py-1.5`
- [ ] Sub-tabs use `bg-neutral-600` bar + same trigger color logic, but responsive `px-1.5 py-1 sm:px-3 sm:py-1.5` padding
- [ ] Record/accordion cards use `rounded-xl border border-primary bg-card p-5` (or the red-tinted danger variant where semantically appropriate)
- [ ] No raw/arbitrary colors introduced where a token or an established pattern above already covers the case
