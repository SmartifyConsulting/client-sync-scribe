
# Profile Page Improvements

## 1. Replace Digital Signature with Timestamp
Remove the signature image upload section entirely. Replace it with an automatic timestamp that records when a doctor "signs" a document. This is simpler and more reliable than uploading signature images.

**Changes in `src/pages/Profile.tsx`:**
- Remove the "Electronic Signature" upload section (lines 770-803)
- Remove the `isUploadingSignature` state and `handleSignatureUpload` function
- Replace with a read-only display: "Documents will be digitally signed with your name and a timestamp"

## 2. Fix Data Loss on Avatar Upload (Autosave)
Currently, uploading a profile picture calls `window.location.reload()` which discards any unsaved form changes. The fix is twofold:
- Remove `window.location.reload()` from avatar upload -- instead, just re-fetch the profile
- Implement autosave: debounce profile field changes and save automatically after the user stops typing (e.g., 1.5 seconds). Remove the manual "Save Changes" and "Save Practice Info" buttons

**Changes in `src/pages/Profile.tsx`:**
- Add a `useRef` + `useEffect` debounce pattern: whenever `formData` changes, start a 1.5-second timer, then call `updateProfile()` automatically
- Remove both "Save Changes" and "Save Practice Info" buttons
- Show a subtle "Saving..." / "Saved" indicator instead
- In `handleAvatarUpload`, replace `window.location.reload()` with a call to `fetchProfile()` from the `useProfile` hook
- Same fix for `handleSignatureUpload` (now removed) and `handleLogoUpload`

## 3. Rename "Profile Picture" Label to Full Name
Under the avatar, instead of showing "Profile Picture", show the user's full name (from `formData.full_name` or `profile.full_name`). If no name is set, show "Profile Picture" as fallback.

**Changes in `src/pages/Profile.tsx`:**
- Line 606: Change `<p className="font-medium text-foreground">Profile Picture</p>` to display `profile?.full_name || "Profile Picture"`

## 4. Send Invite When Adding a Practice Partner
When a doctor adds a partner, send an invitation via the existing `send-user-invitation` edge function so the partner receives an email/notification to join the platform.

**Changes in `src/pages/Profile.tsx` (`addPartner` function):**
- After successfully inserting the partner record, call `supabase.functions.invoke('send-user-invitation', ...)` with the partner's details
- If the partner has a mobile number or can be looked up, search for an existing user; otherwise send an email-based invite
- Add an optional "Partner Email" field to the Add New Partner form so the invitation email can be sent

**Changes in `src/pages/Profile.tsx` (Partner form):**
- Add a new field: "Email (for invitation)" in the partner form
- Update `newPartner` state to include `email`

## 5. Autosave on All Profile Updates
This is covered by item 2 above. The debounce pattern will auto-save all text fields (full name, practice number, doctor registration number, practice address, specialty, mobile number). File uploads (logo, avatar) already save immediately on upload.

## Technical Details

### `src/pages/Profile.tsx`
- Add `useRef` for debounce timer and a `useCallback` for the save function
- Add a `savedStatus` state: `'idle' | 'saving' | 'saved'`
- `useEffect` watching `formData`: clear previous timer, set new 1.5s timer, call save
- Skip autosave on initial load (use a `hasInitialized` ref)
- Remove both `<Button>` elements for manual save
- Add a small status indicator (e.g., "All changes saved" in muted text)
- Remove `window.location.reload()` calls from avatar/logo uploads; call `fetchProfile()` instead
- Remove signature upload section; add a text note about timestamp-based signing
- Change "Profile Picture" label to show user's full name
- Add email field to partner form and trigger invitation on add

### `src/hooks/useProfile.ts`
- No changes needed -- `fetchProfile` and `updateProfile` already exist and work correctly

### Partner Invitation Flow
- When adding a partner with an email, call the `send-user-invitation` edge function
- The existing function handles both existing users (in-app notification) and new users (email invitation)
- Show a toast confirming the invitation was sent
