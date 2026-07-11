# Plan

## Part 1 — Update Holarc logos to deeper-red variant

Replace the four Holarc logo image files with the newly uploaded logo (`HolarcDeepred-Photoroom.png`). All consumers already control display size via Tailwind classes (`h-10`, `h-14`, etc.), so overwriting the source pixels preserves every on-screen appearance.

**Files overwritten (paths unchanged so every existing import keeps working):**
- `src/assets/holarc-logo.png`
- `src/assets/holarc-logo-clear.png`
- `src/assets/holarc-logo-clear-2.png`
- `src/assets/holarc-help-logo.png`

**Untouched:** all consuming components (Landing, Auth, ForgotPassword, ResetPassword, NotFound, MFA/2FA/BackupCodes, Sidebar, ProviderSidebar, ProviderAppLayout, PatientAppLayout, MobileHeader, HolarcHelpHome), plus `vula-symbol.png`, favicons, and PWA manifest icons.

## Part 2 — Fix auto-document sequence on recording stop, with Vula last

The auto-generated document pipeline lives in `src/hooks/useSessions.ts` (invoked after `summarize-session` returns). It creates hospital admission → prescription → medical certificate → referral → invoice → tasks docs, then awards Vulas around line 1041. Users report the sequence is no longer firing on stop.

**Investigate & fix:**
1. Trace the stop-recording path in `src/hooks/useAudioRecording.ts` (`stopRecording`, line 184) into the session finalizer in `useSessions.ts` that calls `summarize-session` (line 185). Identify where the chain is breaking — likely candidates: a thrown error short-circuiting later inserts, the summarize edge function timing out, an early `return`, or a missing await on a promise so Vula fires before docs.
2. Read `supabase/functions/summarize-session/index.ts` edge function logs to confirm whether it's returning the extracted-documents payload the client expects.
3. Restore the full auto-create sequence so each document type is attempted independently (wrap each block in try/catch so one failure doesn't abort the rest), preserving current document contents/templates.
4. **Guarantee Vula awarding runs last:** move the `patient_rewards` insert + notification (currently around lines 1041–1071) after all document-creation blocks have settled (use `await Promise.allSettled([...])` or keep sequential awaits, then award). Only award once every doc block has resolved (success or handled failure).
5. If `summarize-session` is timing out (Edge Functions have short limits), split the work: return summary quickly and dispatch doc creation via `EdgeRuntime.waitUntil` in a background task, with Vula awarding as the last step in that background task. Update the client to reflect pending doc creation state.
6. Add clear console/logger breadcrumbs at each step so future regressions are obvious.

**Out of scope for Part 2:** changing document templates/contents, changing Vula counts or reward rules, refactoring unrelated session logic.
