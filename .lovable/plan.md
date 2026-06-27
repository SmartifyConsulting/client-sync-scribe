## Goal
Stop the preview experience from repeatedly sending you back to login while you are testing changes on the same preview URL.

## Plan
1. **Preserve the existing auth session**
   - Keep the current backend auth client using `localStorage`, `persistSession: true`, and token auto-refresh.
   - Do not change the generated auth client file.

2. **Add a preview-safe session restore guard**
   - Update the shared `useAuth` hook so it waits for the initial stored session to finish loading before protected routes redirect to `/auth`.
   - If `getSession()` briefly returns empty during a Vite hot reload or preview refresh, retry once before treating the user as signed out.

3. **Handle token refresh failures more gently**
   - Listen for real `SIGNED_OUT` events, but avoid immediately clearing the UI during transient startup/refresh timing.
   - Only redirect to login after auth has conclusively settled with no valid session.

4. **Keep manual logout unchanged**
   - The actual Sign Out button will still sign you out immediately.
   - No changes to password, roles, onboarding, or navigation behavior.

5. **Verify in preview**
   - Sign in once, refresh the preview, and confirm the app remains authenticated.
   - Navigate to a protected page after refresh and confirm it does not flash/redirect to login unless the user manually signed out.