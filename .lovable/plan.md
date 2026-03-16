

# Fix Documents Tab Mailbox Email Display

## Problem
In `src/pages/PatientProfile.tsx` (line 379), the mailbox email is **hardcoded** as `docs-ee468073@inbox.medipad.health`. It doesn't fetch the doctor's actual `mailbox_alias` from the profile, so even after Dr. Allie changed his alias, the Documents tab still shows the old hardcoded value.

## Solution

**File:** `src/pages/PatientProfile.tsx`

1. **Fetch the mailbox alias** — Add a `useEffect` that queries the `profiles` table for the current user's `mailbox_id` and `mailbox_alias`, storing them in state.

2. **Display the correct email** — Replace the hardcoded string on line 379 with dynamic logic:
   - If `mailbox_alias` exists → show `{mailbox_alias}@medipad.com`
   - Otherwise fall back to `docs-{mailbox_id.slice(0,8)}@inbox.medipad.health`
   
   This matches the same pattern already used in `src/pages/Profile.tsx` (line 1135).

3. **Add a copy button** next to the email so doctors can easily share it.

## Technical Details
- Import `useAuth` hook to get `user.id`
- Add `mailboxAlias` and `mailboxId` state variables
- Fetch from `supabase.from('profiles').select('mailbox_id, mailbox_alias').eq('id', userId).single()`
- Replace the hardcoded `<code>` block with the computed `displayEmail`

