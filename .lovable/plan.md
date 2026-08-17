# Restructure My Dashboard to the reference layout

Rebuild `/my-dashboard` so the arrangement of elements matches the reference composition, while keeping the app's existing look and feel (current tokens, teal/red palette, Sora/Manrope type, rounded-xl cards, existing accordion/card treatments). No new visual language, no gradients or pastel purple from the reference.

## Layout

```text
+---------------------------------------------------------------+
| Greeting: "Good morning, {name}" + "Here's what matters today" |
+---------------------------------------------------------------+
| Daily summary strip (sleep / medication / next appointment)    |
+-----------------------------------------------+---------------+
| 4 summary cards: How I'm doing | My Care |     | My Care Circle|
|                  My Wellbeing  | My Journey    |               |
+-----------------------------------------------+---------------+
| People I care for  (person cards + "Add someone")              |
+-----------------------------------------------| What's        |
| Things you should know   |  Quick access grid  | happening     |
+-----------------------------------------------+---------------+
```

Right rail (My Care Circle, What's happening) sits alongside on desktop and stacks below on mobile.

## Elements

1. **Greeting header** — name + short subline; keeps current heading styles.
2. **Daily summary strip** — one card, 3-4 short lines (sleep, activity, medication due, next appointment), chevron to detail.
3. **Four summary cards** — How I'm doing (mood, sleep, energy, activity), My Care (medication, appointments, results), My Wellbeing (entry point to the conversational assistant), My Journey (trend/longevity snapshot).
4. **People I care for** — horizontal card row per person (name, relation, status chip, 2-3 status lines) plus an "Add someone" tile.
5. **Things you should know** — short bulleted insight list.
6. **My Care Circle** — list of practitioners/family with avatar, role, chevron; "View my Round Table" action at the bottom.
7. **What's happening** — upcoming items list; "View all appointments" action.

## Greyed-out preview frames

The five existing preview tiles (My Documents, Lab Results, My Tasks, My Round Tables, My Admissions) are kept, but move into a **Quick access** grid placed beside "Things you should know" in the lower band, so they sit around the new elements rather than owning the page. They keep the current disabled treatment (muted background, lock icon, "Coming soon") and the same unlock rule for the demo account.

Every new element listed above also renders in the same greyed/preview state for accounts that are not unlocked, so the whole page reads as a consistent preview; the unlocked demo account sees them live where data exists and greyed where it does not yet.

## Technical notes

- All work in `src/pages/MyPersonalDashboard.tsx`, extracting the repeated card shells into small local components in the same file.
- Reuse existing tokens/utilities (`cn`, card/border classes already used across the app). No hardcoded colours.
- Data: static placeholder content this pass — no new queries, tables, or backend changes.
