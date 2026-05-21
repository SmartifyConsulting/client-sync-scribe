## Changes

### 1. Remove SOS Voice Clip tab from HolarcHelp admin

In `src/pages/admin/HolarcHelpProviders.tsx`:

- Remove the `voice-clip` TabsTrigger and its TabsContent.
- Remove the `voiceClipPath`, `clipFile`, `uploadingClip` state, `loadVoiceClip`, `uploadClip`, related useEffect, and the `Mic2` import.
- Update the page description: drop "and the SOS voice clip".

### 2. Show Address + Phone in User Admin

In `src/features/admin/components/UsersTab.tsx`:

- Extend the hospital profiles fetch to also select `practice_address`
- &nbsp;
- Add an "Address" column **only** on the Hospital tab; within that tab show the hospital address for hospital_staff rows and "—" for other emergency roles.
- Fields are read-only in the table (editing handled by the existing edit flow / autosave below).

### 3. Autosave on changes across Admin

Switch every admin form from explicit Save buttons to debounced autosave (500ms) with a subtle "Saving… / Saved" status indicator next to each field group.

- **UsersTab inline edit (`src/features/admin/components/UsersTab.tsx`)**
  - Remove the Save/Cancel buttons; clicking Pencil still opens edit mode, but typing in First/Last/Email autosaves on debounce.
  - Email change still routes through the `admin-update-email` edge function (only fires once the new value is a valid email and differs from current).
  - Role Select already autosaves (kept as-is, including the admin-confirmation dialog).
  - HolarcHelp toggle already autosaves (unchanged).
  - Replace per-row Save icon with a small status pill: idle → "Edited" → spinner → check.
- **Provider edit dialog (`HolarcHelpProviders.tsx` → `ProviderDialog`)**
  - Remove the Save button. Each field autosaves on blur/change (debounced 500ms). Dialog footer shows live "Saving / Saved" state and a Close button only.
  - Approve action still requires explicit click.
- **PricingAdmin (`src/pages/admin/PricingAdmin.tsx`)**
  - Remove explicit Save; autosave each pricing tier field on debounce. Show inline "Saved" indicator.
- **GamificationAdmin (`src/pages/admin/GamificationAdmin.tsx`)**
  - Same pattern: drop Save buttons, autosave with debounce and "Saved" indicator.

A shared `useAutosave(value, save, { delay: 500 })` hook will live at `src/features/admin/hooks/useAutosave.ts` and be reused across all four surfaces.

## Technical notes

- The `holarchelp_voice_clip_settings` table and `guardian-voice-clips` storage bucket are left untouched (no data migration) — only the admin UI is removed.
- For the Emergency tab Address lookup we batch-query `holarchelp_hospitals` by `owner_id IN (...)` once per fetch.
- Email autosave guards: skip if value === original, skip if it fails a basic RFC regex, and show an inline error toast if the edge function rejects.
- Role changes that require confirmation (to/from admin) keep the AlertDialog — autosave only applies after confirmation.

## Out of scope

- No schema changes (no new `address` column on profiles).
- No edits to non-admin pages or to the existing SOS user flow that consumes the voice clip.
- No changes to the bucket / DB row for the voice clip.