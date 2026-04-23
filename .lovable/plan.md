

# Plan: SessionDetail typography to 11–12px scale + Doctor private notes

Two scoped changes to `/sessions/:id`. The system-wide style question is answered briefly at the end.

## 1. Bring SessionDetail to the 11–12px scale

`src/pages/SessionDetail.tsx` still uses the legacy 14–24px sizes (`text-2xl`, `text-sm`, `font-semibold` defaults). Standardise per the project's compact scale used everywhere else (Round Table, Patient Profile, Documents).

| Section | Element | Current | New |
|---|---|---|---|
| Back link | text | `text-sm` | `text-[11px]` |
| Header | Page title `h1` | `text-2xl font-bold` | `text-[16px] font-semibold` |
| Header | Icon tile | `h-14 w-14` / `h-7 w-7` | `h-10 w-10` / `h-5 w-5` |
| Header | Meta line (time, duration) | `text-sm` | `text-[11px]` |
| Header | Status pill | `text-xs` | `text-[10px]` |
| Header | Patient link | `text-sm` | `text-[12px]` |
| Header | Delete button | `size="sm"` default text | add `text-[11px]` |
| Quick Actions card | `h2` | default (~16px) | `text-[12px] font-semibold` |
| Quick Actions card | Buttons | `text-sm h-10` | `text-[11px] h-9` (icons stay `h-4 w-4`, gap `gap-1.5`) |
| AI Summary | `h2` + subtitle | default + `text-xs` | `text-[12px] font-semibold` + `text-[11px]` |
| AI Summary | Icon tile | `h-10 w-10` / `h-5 w-5` | `h-8 w-8` / `h-4 w-4` |
| AI Summary | Translate Select trigger + items | `text-xs h-8` | `text-[11px] h-8` |
| AI Summary | Body paragraph | default (~16px) | `text-[12px] leading-relaxed` |
| Session Notes | Header `h2` + subtitle | default + `text-xs` | `text-[12px] font-semibold` + `text-[11px]` |
| Session Notes | Audio / Transcript / Notes labels | `text-sm font-semibold` | `text-[11px] font-semibold uppercase tracking-wide` |
| Session Notes | Transcript paragraphs | default | `text-[12px]` |
| Session Notes | Notes paragraph | default | `text-[12px]` |
| Session Notes | Amber retention alert | `text-xs` | `text-[11px]` |
| Session Notes | Download Select trigger | `text-xs h-8` | `text-[11px] h-8` |
| Session Documents | `h2` + subtitle | default + `text-xs` | `text-[12px] font-semibold` + `text-[11px]` |
| Session Documents | Row name | `text-sm font-medium` | `text-[12px] font-semibold` |
| Session Documents | DRAFT badge | `text-[10px]` | keep |
| Session Documents | Action buttons | `h-7 w-7 / h-3.5` | keep |
| Action Points | `h2` + subtitle | default + `text-xs` | `text-[12px] font-semibold` + `text-[11px]` |
| Action Points | List item | default | `text-[12px]` |
| Empty state | text | default | `text-[11px]` |

Card padding stays `p-6` desktop, but icon tile shrinks so the card visually rebalances. No structural changes — only typographic scale.

## 2. Doctor-only Private Notes section

These are notes a doctor writes for themselves on a session — never shown to other doctors or to the patient.

### Schema

New nullable column on `public.sessions`:

```sql
ALTER TABLE public.sessions ADD COLUMN private_notes text;
```

No new RLS needed: the existing session policies are already owner-only (`auth.uid() = user_id` for SELECT/UPDATE/DELETE; INSERT WITH CHECK same). A second doctor with `doctor_patient_access` to the patient cannot read this row at all because no cross-doctor SELECT policy exists on `sessions`. So a column on this table is automatically private to the recording doctor.

**Documents/Round Table comparison:** I confirmed `documents` and `round_table_notes` are the only tables that intentionally expose data across doctors via additional policies. `sessions` does not — perfect for private notes.

### UI

New card placed immediately below the public **Session Notes** card (and above Session Documents), so it reads as the private companion to the shared notes.

- Card: `rounded-xl border border-amber-500/40 bg-amber-50/30 dark:bg-amber-950/10 p-6` — amber border to visually flag "private".
- Header row:
  - Icon tile `h-8 w-8 rounded-lg bg-amber-500/15`, `Lock` icon (lucide) `h-4 w-4 text-amber-600`.
  - `h2` "Private Notes" — `text-[12px] font-semibold`.
  - Subtitle `text-[11px] text-muted-foreground`: "Only visible to you. Not shared with the patient or other doctors."
  - Right side: Edit / Save / Cancel buttons (`size="sm" text-[11px]`).
- Body:
  - Read mode (default when not editing and `private_notes` set): `<p className="text-[12px] whitespace-pre-wrap text-foreground">{session.private_notes}</p>`.
  - Empty + not editing: muted placeholder line "No private notes yet — click Edit to add notes only you can see." (`text-[11px] text-muted-foreground italic`).
  - Edit mode: `<Textarea text-[12px] min-h-[140px]>` bound to a local `privateNotesDraft` state; Save calls `supabase.from('sessions').update({ private_notes: privateNotesDraft }).eq('id', id)`, refreshes the session via the existing `useSession` hook (add a `refetch` or invalidate), and toasts "Private notes saved". Cancel discards the draft.

Always rendered (even when `session.private_notes` is empty) so the doctor can add notes from any session view.

### Hook changes

`src/hooks/useSessions.ts` → make sure `useSession` returns `private_notes` (Supabase types regenerate automatically once the column exists; the hook uses `select('*')` patterns so no change needed there). Add a small `refetch()` returned from `useSession` so the new card can refresh after save without a full page reload. If `useSession` already exposes a refresher, reuse it; otherwise add one tiny `setRefreshKey` pattern.

### Files touched

| File | Change |
|---|---|
| `supabase/migrations/<new>.sql` | `ALTER TABLE public.sessions ADD COLUMN private_notes text;` |
| `src/hooks/useSessions.ts` | Expose a `refetch` from `useSession` (small additive change). |
| `src/pages/SessionDetail.tsx` | Apply the typography table above; add the Private Notes card with edit/save/cancel logic and `Lock` icon import. |

## On the system-wide consistency question

There's no enforced design-token layer for typography in this project — `STYLE_MANIFEST.md` covers spacing/layout but doesn't fix a numeric font scale, so older pages drifted to Tailwind defaults (`text-sm`, `text-2xl`) while newer pages use the explicit `text-[11px]`/`text-[12px]` pattern. A real fix is a follow-up: add a typography section to `STYLE_MANIFEST.md` (e.g. body 12px, label 11px, page title 16px, section title 12px-semibold), and a one-time sweep across the remaining legacy pages. **Not done in this task** — call it out and tackle as its own pass once you confirm the scale you want canonised.

## Out of scope

- Sweeping every other legacy page to the 11–12px scale (separate, larger pass).
- Sharing/printing private notes — they intentionally never leave the doctor's view.
- Including private notes in the AI summary or transcripts.

