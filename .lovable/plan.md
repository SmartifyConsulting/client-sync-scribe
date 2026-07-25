## Goal

Restyle the sectioned accordions on **My Practice** (doctor) and **Overview** (patient My Profile) so all sections sit inside a single bordered "table" frame — like the My Patients screen — instead of separate cards with gaps.

## Visual target

- One outer rounded card with the standard darker-grey border (`border-neutral-400`).
- Each section (About Me, Personal Information, Practice Information, etc.) becomes a **row** inside that frame.
- Rows are separated by a thin `divide-y` line — no per-row border, no per-row rounded corners, no vertical gap.
- Section header row keeps the current icon + title styling; expanded content sits directly below within the same frame.
- Everything inside sections (fields, labels, spacing) stays exactly as it is today.

```text
┌──────────────────────────────────────────────┐
│  ▸ About Me                                  │
├──────────────────────────────────────────────┤
│  ▸ Personal Information                      │
├──────────────────────────────────────────────┤
│  ▾ Practice Information                      │
│     [expanded fields...]                     │
├──────────────────────────────────────────────┤
│  ▸ Emergency Contacts                        │
└──────────────────────────────────────────────┘
```

## Scope

Two screens only, so you can compare:

1. **My Practice → Practice tab** (`src/pages/MyPractice.tsx`) — wrap `AboutMeAccordion`, Personal Information, Practice Information (and any other accordions in the same tab) inside one shared frame.
2. **Patient Overview** on My Profile (`src/features/patients/components/PatientDetailsEditor.tsx`, ME mode / Overview tab) — same treatment for its accordions and `EmergencyContactsInline`.

Other tabs (Templates, Credentials, Rewards, other patient tabs) are **not** touched in this pass — you asked for these two so you can test first.

## Technical notes

- Introduce a small wrapper (`<div className="rounded-xl border border-neutral-400 bg-card shadow-sm divide-y divide-neutral-300 overflow-hidden">`) around the section list.
- Strip `rounded-xl border border-neutral-400 bg-card shadow-sm` and `space-y-*` from the individual `AccordionItem`s and from `EmergencyContactsInline`'s outer `Collapsible` when rendered inside these frames (add a `flat` prop to `EmergencyContactsInline` so it drops its own border only in these two contexts — its other usages keep the current framed look).
- Keep the existing accordion trigger/content padding so field density is unchanged.

## Out of scope

- No changes to field layouts, labels, spacing, colours, or which sections exist.
- No changes to other tabs or other pages.
- No changes to `EmergencyContactsInline` behaviour outside these two screens.
