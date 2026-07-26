## 1. Documents: same grouping toggle and layout as My Tasks / My Sessions

Apply the identical pattern (bordered frame + flat accordion rows, count pill, green open row, grey hover) to both document screens:

- **Patient — My Documents** (`src/pages/patient/PatientDocuments.tsx`): today it renders one flat list. Wrap it in the shared accordion frame with a Date / Type toggle (Date default).
- **Doctor — All Documents** (`src/pages/Documents.tsx`): replace the "Group by" dropdown and sticky grey group headers with the same toggle + accordion frame. Doctor gets three toggle options: Date / Type / Patient (Date default).

Date buckets match My Sessions: Today, This week, This month, Older.
Row content, actions (preview / edit / share / delete) and CRUD stay exactly as they are today.

## 2. Fix: expanded accordion row title must turn white

Root cause to fix: the inner label elements carry their own colour classes (`text-foreground`, `text-primary`, badge colours), which win over the trigger's `data-[state=open]:text-white`.

Fix centrally by extracting one shared trigger class + count pill helper (e.g. `src/components/ui/section-accordion.tsx`) that forces white on every descendant when open, and use it in all reformatted screens:

- My Practice (`MyPractice.tsx`)
- My Sessions (`MySessions.tsx`)
- My Tasks (`TodoList.tsx`)
- All Documents / My Documents (both files above)
- Personal Information + Medical Information (`PatientDetailsEditor.tsx`, `EmergencyContactsInline.tsx`)

## 3. Fix: top row open by default, green with white text

In every one of those screens the first accordion item is included in `defaultValue`, so it renders open (green background, white title and white chevron) on first load. Any other row the user opens also becomes green/white; closed rows are white with light-grey hover.

## 4. Sidebar avatar and document mailbox address

In `src/components/layout/Sidebar.tsx`:
- Reduce the bottom-left avatar by 20% (h-16 w-16 → h-[3.2rem] w-[3.2rem]).
- Show the user's document mailbox address under their name, in small muted 11px text, truncated. It uses the same value as My Practice: `mailbox_alias@holarc.com` when an alias is set, otherwise `docs-<first 8 of mailbox_id>@inbox.holarc.health`.

## Technical notes

- Mailbox lookup: read `mailbox_id, mailbox_alias` from `profiles` for the signed-in user (cached via React Query so it isn't re-fetched on every nav).
- Grouping state is local component state; no schema or backend changes are needed.
- Shared accordion styling lives in one module so future screens stay consistent.
