
## 1. Sidebar bottom avatar (desktop)

`src/components/layout/Sidebar.tsx` (AccountMenu trigger):
- Shrink avatar from `h-[73px] w-[73px]` → `h-16 w-16` (matches the My Practice profile picture).
- Drop the framed square around the user's name — remove `border border-transparent hover:border-primary rounded-xl` on the trigger button; keep padding + a subtle `hover:bg-muted/50`.

## 2. Restore avatar to the top-right

`src/components/layout/TopBarIcons.tsx`:
- Append a right-most `<Avatar className="h-9 w-9 border-2 border-primary">` (image from `profile?.avatar_url`, fallback via existing `getInitials()`).
- Wrap it in the shared `AccountMenu` so it opens the same popover (including the profile switcher).
- No label, no square frame. `AppLayout` already renders `TopBarIcons` in the top-right, so no layout change needed.

## 3. Darker accordion borders — My Holarchy and My Practice

- `src/features/patients/components/PatientDetailsEditor.tsx`: replace every accordion `border border-border` with `border border-neutral-400`.
- `src/pages/MyPractice.tsx`: replace accordion `border border-primary-dark` (and any `border border-border`) with `border border-neutral-400`.
- Outer section frames (`border border-primary`) stay unchanged — only inner accordion frames darken.

## 4. My Practice tabs → visual parity with My Holarchy

In `src/pages/MyPractice.tsx`:
- Page H1 + subtitle: keep `text-3xl font-bold` heading and `text-xs text-muted-foreground` subtitle (matches My Holarchy).
- Standardise every `TabsTrigger` to `text-xs px-3 py-1.5 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-black` — remove the mixed responsive `px-1.5/py-1 sm:px-3` variants so all triggers are identical.
- Each `TabsContent` opens with a shared header block: `<h2 className="text-lg font-semibold text-foreground">…</h2>` + `<p className="text-xs text-muted-foreground">…</p>`, mirroring My Holarchy tab headings. Suppress duplicate headings inside embedded pages via the existing `hideHeader` prop pattern (already used for `Documents`/`Invoices`) and extend it to `ReferralDoctors`, `CPDCertificates`, `DoctorRewards`.
- Sub-tab menus inside Templates/Rewards reuse the same TabsList styling.

## 5. 12px body text inside My Practice tab frames

- Wrap each `TabsContent` in `<div className="my-practice-tab-body">…</div>`.
- Add to `src/index.css`:

```css
.my-practice-tab-body,
.my-practice-tab-body p,
.my-practice-tab-body span,
.my-practice-tab-body label,
.my-practice-tab-body button,
.my-practice-tab-body input,
.my-practice-tab-body textarea,
.my-practice-tab-body td,
.my-practice-tab-body th,
.my-practice-tab-body li { font-size: 12px; line-height: 1.35; }

.my-practice-tab-body h1,
.my-practice-tab-body h2,
.my-practice-tab-body h3 { font-size: 14px; }
```

## 6. Rename patient nav item "My Holarchy" → "My Profile"

- `src/i18n/locales/en.json`: change `nav.myHolarchy` value from `"My Holarchy"` to `"My Profile"`.
- `src/components/layout/Sidebar.tsx` (line 55): hardcoded fallback `"My Holarchy"` → `"My Profile"`.
- `BottomNav.tsx` reuses the same key — auto-updates.

## 7. Any-to-any profile switching (drop admin-only gate)

- In `src/components/layout/AccountMenu.tsx`, remove the `isAdmin` gate around the switcher list so every test account sees the full `TEST_PROFILES` list.
- Update `supabase/functions/admin-impersonate/index.ts` so the caller allow-list is the set of `TEST_PROFILES` emails (plus admin) — production users still cannot invoke it.
- Hide the switcher entirely for anyone whose signed-in email is not in `TEST_PROFILES`.

## 8. Update the test-profiles roster

`src/components/layout/testProfiles.ts`:
- Remove: Paraskevi, Christina, Jean Prodromos.
- Add: Okili and Dr — need their sign-in emails and roles.

Question before I build step 8: what are the exact login emails and roles for "Okili" and "Dr"?

## 9. Bold field labels and field text across the app

Goal: every form field label and the value inside every field renders bold, everywhere.

- In `src/index.css`, add global rules that target both native and Radix/shadcn primitives:

```css
label,
[data-slot="label"],
.form-label { font-weight: 600; }

input, textarea, select,
[data-slot="input"], [data-slot="textarea"], [data-slot="select-trigger"],
[role="combobox"], [role="spinbutton"], [role="textbox"],
[contenteditable="true"] { font-weight: 600; }

input::placeholder,
textarea::placeholder { font-weight: 500; }
```

- Keep the existing shadcn `Label` component API unchanged — the CSS layer above upgrades it globally so no per-component edits are needed.
- Verify in read-only "view mode" fields (which render as disabled inputs across `PatientDetailsEditor.tsx` and `MyPractice.tsx`) that the bold weight reads correctly against the muted background; if any specific spot is too heavy, override locally with `font-normal`.

## Files touched

- `src/components/layout/Sidebar.tsx`
- `src/components/layout/TopBarIcons.tsx`
- `src/components/layout/AccountMenu.tsx`
- `src/components/layout/testProfiles.ts`
- `src/features/patients/components/PatientDetailsEditor.tsx`
- `src/pages/MyPractice.tsx`
- `src/index.css`
- `src/i18n/locales/en.json`
- `supabase/functions/admin-impersonate/index.ts`

## Out of scope

No colour changes, no business-logic changes, and no changes to the underlying tab pages beyond the shared 12px scope and the `hideHeader` prop already in use.
