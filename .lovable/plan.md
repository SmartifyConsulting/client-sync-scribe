

# Plan: Finish CalendarView for shared practice calendar

Wire `src/pages/CalendarView.tsx` into the practice schema + hooks already created. No further DB changes.

## Changes to `src/pages/CalendarView.tsx`

1. **New state + hooks**
   - Import `usePractice` and `useProfile`.
   - `const { practice, members } = usePractice();`
   - `const [scope, setScope] = useState<'mine' | 'practice'>(() => (localStorage.getItem('calendar-scope') as any) || 'mine');` — persists to `localStorage`.
   - Build a `colorByDoctor: Record<string, string>` from `members` (`doctor_id → practice_color || '#0EA5E9'`).
   - Extend the local `CalendarEvent` shape with `ownerId: string`, `ownerName?: string`, `ownerColor?: string`, `practiceId?: string | null`.

2. **Scope toggle UI** (header, beside the existing week/month/year switch, only rendered when `practice` exists)
   ```
   [ My Calendar ] [ Practice Calendar ]
   ```
   Same compact pill style as the view-mode group (`text-[11px] md:text-sm`, primary fill when active).

3. **Appointment fetch** (replace the existing `useEffect` that filters `eq('user_id', user.id)`)
   - Always fetch by date range. Filter:
     - `scope === 'mine'` → `.eq('user_id', user.id)`
     - `scope === 'practice'` → `.eq('practice_id', practice.id)` (RLS allows because the user is a member)
   - Select also `user_id, practice_id`. Map into events with `ownerId = apt.user_id`, `ownerColor = colorByDoctor[apt.user_id]`, `ownerName = members.find(m => m.doctor_id === apt.user_id)?.full_name`.
   - Re-run when `scope`, `practice?.id`, `selectedDate`, or `members` change.

4. **Render owner color & chip** (month view + week view + Today's Schedule)
   - When `scope === 'practice'`, override the event tile background/text using `ownerColor` (`${ownerColor}22` bg, `ownerColor` text) instead of the `getTypeColor` service color.
   - Add an owner chip in front of the time on each tile: `<span className="inline-flex h-4 px-1 rounded text-[9px] font-bold text-white" style={{ backgroundColor: ownerColor }}>{initials of owner full_name}</span>`. Tooltip = full doctor name. (Patient initials chip stays on the right.)
   - In Today's Schedule panel, also show a small owner badge next to the patient initials when in practice scope.

5. **Booking dialog**
   - Add a `practice_id` line in the insert payload: `practice_id: scope === 'practice' && practice ? practice.id : null`. (The current handler is a stub `toast`-only — we'll replace it with a real `supabase.from('appointments').insert(...)` so the toggle is actually meaningful. `user_id` stays `auth.uid()`.)
   - Header label of the Book dialog says "Schedule on Practice Calendar" when `scope === 'practice'`.

6. **Edit / delete gating**
   - In `handleEventClick`, if `event.ownerId !== user.id`, open the detail dialog in **read-only** mode: hide Edit + Delete buttons, replace with a footnote: `"Owned by Dr <ownerName> — only they can change this."` (`text-[11px] text-muted-foreground italic`).
   - `handleSaveEvent` and `handleDeleteEvent` already mutate local state only. Add a real `supabase.from('appointments').update/delete` call guarded by `event.ownerId === user.id` (RLS will reject anyway, but the UI shouldn't even attempt it).

7. **Google sync note**
   - Small line under the Google Calendar button when connected:
     `<p className="text-[10px] text-muted-foreground max-w-[200px]">Google sync mirrors only your own appointments.</p>`

8. **Cleanup**
   - When `scope === 'practice'` but `!practice`, fall back to `'mine'` and don't render the toggle.
   - Refetch appointments on tab focus (`window.addEventListener('focus', fetchAppointments)` in the same effect) so colleagues' new bookings show up live.

## Files touched

| File | Change |
|---|---|
| `src/pages/CalendarView.tsx` | Add scope toggle, practice fetch path, owner-color rendering, owner chip + tooltip, edit/delete gating, real insert/update/delete to Supabase, focus refetch, Google-sync footnote. |

## Out of scope

- Realtime subscription on appointments (focus refetch + per-action local update is enough for v1; can add later if needed).
- Patient-side practice calendar view.
- Surfacing pending practice invitations on the Calendar page (already handled in My Practice via `usePractice.pendingInvites`).
- Migrating historical appointments into a practice (left at `practice_id = null`, i.e. personal).

