# Patient Dashboard — Emotional Layer + Working Drill-Downs

Evolve the existing `/my-dashboard` in place. Same structure, same cards, same data sources, same teal/white identity. Every card gains an emotional headline above its evidence, and every card becomes clickable through to the screen that owns that information.

## 1. Emotional state engine

A new shared helper derives the patient's state from real data first, falling back to the dashboard's existing demo values when an account has no data yet.

Signals used (all already in the app): upcoming appointments, open tasks, medication adherence, Biolog entries, new lab results, round table notes.

States and copy:

| State | Headline |
|---|---|
| Good | You're doing well. |
| Stable | Things look steady. |
| Mixed | A few things are changing. |
| Tasks outstanding | There's a little to catch up on. |
| Attention | Something may need your attention. |
| Caregiver good | They're doing well. |
| Caregiver concern | Someone may need you. |

The greeting line becomes dynamic: "Good afternoon, Georgia. You're doing well. Here's what matters today." — the second sentence comes from the engine, never hard-coded.

Tone rules baked into the copy set: quiet, warm, sophisticated. No motivational slogans, no alarm language for normal variation, no diagnosis, no medical instruction.

## 2. Card-by-card changes

Each card keeps its current metrics and layout; the emotional line and a footer link are added.

- **Daily summary strip** → "Here's what we've noticed" — a short written paragraph replacing the bullet list, with "See what's behind this →" opening the existing metrics underneath. This strip is halved in width and the **Quick View** dropdown (renamed from Quick Access, moved out of the hero) sits beside it on the same row.
- **How I'm doing** → dynamic emotional headline + "Feeling good · Sleeping well · Staying active" descriptor, then the existing Mood / Sleep / Energy / Activity metrics. Drills to Biolog.
- **My Care** → "You're in good hands" / "Your care is up to date", then Medication · Appointments · Results. Each row links to its own screen (medications, calendar, lab results). Footer: "See what needs your attention →".
- **My Wellbeing** → "You don't have to figure it out alone" / "Something on your mind?" with the Ask Angel entry point wired to the existing companion route. Reflection framing only — no advice claim.
- **My Journey** → "You're moving in the right direction" / "See how your choices, patterns and wellbeing are evolving", keeping the trend, wellbeing and longevity content. Ageing is never the headline. Drills to Biolog.
- **My Care Circle** → "You're not looking after yourself alone" / "The people looking out for you". Each person links to their record; footer "View my Round Table →" goes to the patient round table.
- **People I care for** → "They're okay." / "The people you're looking out for". Each person card links through to that person's detail view, populated from the same demo entries the cards already use — no new invented data. Adds the calm **Peace of mind** summary state when everyone is normal, and the amber "Someone may need you" state with Check in / Send reminder / View details actions plus the resolved "all caught up" state.
- **Person detail view** → opens with "Mum is doing well" and last-updated time, then how she's doing (mood, sleep, activity, medication), then "Nothing currently requires your attention", then **Her recent story** — a Today / Yesterday / This week timeline built from the existing demo entries.
- **Things you should know** → "We've noticed", surfacing Biolog-derived observations where enough data exists, explicitly labelled as observations rather than diagnoses. Drills to Biolog.
- **What's happening?** → "You're in the loop" / "Nothing important is getting lost", keeping the schedule list. Each row links to the appointment or result; footer "View all care →".
- **You are known** → new compact card in the profile area: "Your care team knows more than your medical history", with What matters to me / How I like to communicate / My story indicators sourced from the existing relationship-profile data, and "View my profile →".

## 3. Drill-down wiring

Every panel header, list row and footer link becomes a real navigation target using existing routes: Biolog, Ask Angel, lab results, admissions, documents, tasks, calendar, round table, doctors, patient details. Nothing lands on a dead card.

## Technical notes

- Work stays in `src/pages/MyPersonalDashboard.tsx` plus new presentational pieces under `src/components/dashboard/` (emotional headline block, person card, person detail view, "You are known" card).
- A new `src/lib/emotionalState.ts` holds the state derivation and the copy dictionary so the language stays consistent across the app.
- Real data comes from the hooks already in use (`useAuth`, `useProfile`, `usePatientRewards`, appointment and round-table queries) plus lightweight queries against existing tables for tasks, medication adherence and Biolog entries. No schema changes.
- The V2 gating (`unlocked`) behaviour, hero card, Vula counter, avatar upload and responsive grid are preserved exactly.
