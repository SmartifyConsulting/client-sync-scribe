## Scope

Three changes, scoped to the Hospital and ER (ambulance) provider portals only — the main Holarc Health app is untouched.

### 1. ER Portal logo

- Copy the attached image to `src/assets/holarc-help-logo.png`.
- Import it as `holarcHelpLogo` in `ProviderSidebar.tsx` and `ProviderAppLayout.tsx`.
- When `portal === "ambulance"`, render `holarcHelpLogo` in the sidebar header and mobile header. When `portal === "hospital"`, keep the current `holarc-logo-clear-2.png` (Holarc Health).

Open question: earlier you asked for the HolarcHelp logo on *both* portals. This plan applies it to ER only because the latest message says "for the ER Portal". If you want it on the Hospital portal too, say so and I'll use the same logo in both.

### 2. Remove Mic and Calendar from provider top bar

`TopBarIcons` is shared between the main app and the provider shell. Add an optional prop:

```ts
type TopBarIconsProps = { variant?: "default" | "provider" };
```

When `variant="provider"`, skip the Calendar block (lines 132–144) and the Mic block (lines 146–158). Bug report, Bell, and Avatar remain. The main app continues to call `<TopBarIcons />` with no variant, so its top bar is unchanged.

Update both `ProviderAppLayout.tsx` call sites (desktop top bar + mobile header) to pass `variant="provider"`.

### 3. Provider notification bell: profile-only

Today the bell shows every unread row from `notifications` for the user. In the provider shell we want it limited to "interactions with their profile" — i.e. alerts about the provider's own account/profile activity, not operational ops noise (incoming SOS, triage, etc., which already live in the stats strip and dedicated screens).

Add a `variant="provider"` branch to the two notification queries (`unread-notifications-topbar` and `recent-notifications-topbar`) that filters by `notification_type`. Proposed allow-list of profile-interaction types:

- `access_request` / `access_granted` / `access_revoked`
- `profile_message` / `provider_message`
- `affiliation_request` / `affiliation_accepted`
- `role_change` / `account_security`
- `invitation_received` / `invitation_accepted`

I'll confirm the exact enum values against the `notifications` table before wiring the filter (read-only `supabase--read_query` on `select distinct notification_type from notifications`). Query keys become `["unread-notifications-topbar", variant]` so cached counts don't collide with the main app.

Open question: is the list above the right shape, or do you want a stricter "anything where someone touched my user/practitioner profile record" rule? If stricter, I'll filter to a single `profile_*` prefix and we may need to add new notification types in a follow-up.

### Out of scope

- No DB migrations, no changes to how notifications are created.
- No changes to the main app's top bar, sidebar, or notification behavior.
- No changes to operational screens, routing, or stats strip.

### Files

- New asset: `src/assets/holarc-help-logo.png` (copied from upload)
- Edit: `src/components/layout/TopBarIcons.tsx` (add `variant` prop, conditionally render Calendar/Mic, filter notification queries)
- Edit: `src/components/layout/ProviderAppLayout.tsx` (pass `variant="provider"`, switch logo per portal)
- Edit: `src/components/layout/ProviderSidebar.tsx` (switch logo per portal)
