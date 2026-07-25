## Fixes for My Sessions

### 1. Restrict the Date/Patient toggle to doctors

In `src/pages/MySessions.tsx`, read the current role via `useUserRole()` (`isDoctor`) and only render the `<ToggleGroup>` when `isDoctor` is true. For patients, force `groupMode = "date"` and update the subtitle to drop the "or by patient" phrasing. Patients will only ever see the date-bucketed view (Today / Last week / Last month / Older).

### 2. Why the expanded row title isn't turning white — and the fix

Yes, changing the title font colour on expand is absolutely possible. It isn't working today because of a CSS-specificity collision, not a missing rule.

The shared primitive `src/components/ui/accordion.tsx` hardcodes `text-primary` (green) and `bg-white` on every `AccordionTrigger`:

```
"... px-3 py-2 text-sm font-semibold bg-white text-primary border border-border rounded-md ..."
```

In `MySessions.tsx` we then pass:

```
"... data-[state=open]:bg-primary data-[state=open]:text-white ..."
```

`tailwind-merge` (via `cn`) treats a plain utility (`text-primary`) and a variant utility (`data-[state=open]:text-white`) as different groups, so **both** end up in the final class list. Once both classes exist, the browser picks the one that appears later in the generated stylesheet — and Tailwind emits base utilities after variant utilities in dev mode, so `text-primary` wins and the label stays green even when the row is open. Same story for `bg-white` vs `data-[state=open]:bg-primary` on some builds.

Two clean ways to fix it — pick one:

- **A. Override with `!important` at the call site (smallest blast radius).** Change the trigger classes in `MySessions.tsx` to `data-[state=open]:!bg-primary data-[state=open]:!text-white data-[state=open]:hover:!bg-primary/90` and also mark the count-pill's open state with `!` (`group-data-[state=open]:!bg-white group-data-[state=open]:!text-primary`). This forces the open-state colours to win regardless of stylesheet order.

- **B. Remove the hardcoded colours from the primitive.** Drop `bg-white text-primary border border-border rounded-md` from the base `AccordionTrigger` className in `src/components/ui/accordion.tsx` so every consumer supplies its own colours. Safer long-term but touches every accordion in the app, so we'd need to spot-check the other screens that rely on the default styling.

Recommendation: go with **A** now (scoped, zero risk to other screens). We can revisit **B** as a separate cleanup later.

### Acceptance
- Patient signed in on `/my-sessions`: no Date/Patient toggle visible; only date buckets shown.
- Doctor signed in on `/my-sessions`: toggle visible, both grouping modes work.
- In both roles, the open accordion row has a green background with white title text, white chevron, and the count pill flips to white background with green text. Closed rows remain white with the default label colour and show a light grey hover.