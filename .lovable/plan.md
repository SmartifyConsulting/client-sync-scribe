# Plan

Five focused changes across the doctor experience.

## 1. Bigger dialing-code selector

`src/components/forms/PhoneNumberInput.tsx` (used by sign-up, profile, partner forms):

- Bump the dial-code `SelectTrigger` from `w-[10.5rem] h-11 text-base` → `w-[13rem] h-12 text-lg`.
- Bump the flag from `text-lg` → `text-2xl`, the `+code` from `font-semibold` → `text-lg font-semibold`, and the ISO code label from `text-xs` → `text-sm`.
- Bump dropdown items (`SelectItem`) to `text-lg` with `text-2xl` flag for legibility.
- Local number `Input` stays `h-12 text-lg` to match height.

No behaviour change — purely sizing.

## 2. Mailbox alias explainer

`src/pages/MyPractice.tsx` mailbox section (around line 220–290):

- Add a short helper paragraph directly under the alias field, styled like the existing field hints:
  > *"*This address is solely for emailing files (scans, referrals, and lab results) directly to your **My Documents** tab, not for standard messaging. Share this email with anyone sending you medical records so they are automatically routed straight to your **Holarc Health** profile*"*
- Add a small `Info` icon prefix so it reads as guidance.

## 3. Practice partner add — 3 ways

Replace the current "type a new partner" form in `MyPractice.tsx` (partner section ~line 446–700) with a tabbed `Add Partner` panel:

1. **Select existing** — Combobox dropdown listing users already on the platform (search `profiles` by `full_name` / `email`, role `doctor`). On select, insert into `practice_partners` linked to that `user_id`.
2. **Invite by email** — current flow (name + registration number + email). Keeps the existing `send-partner-invite` call.
3. **Share app link** — read-only field with `https://holarchealth.com/?invite=<doctorId>` and Copy / WhatsApp / Email buttons (reuses `ShareAppDialog` pattern from `src/components/ShareAppDialog.tsx`).

The three options live as `Tabs` inside the existing partner card; default tab = "Select existing".

## 4. "My Sessions" nav item + accordion page

- `src/components/layout/Sidebar.tsx`: insert a new doctor nav entry directly after `My Patients`:
`{ icon: Mic, label: "My Sessions", labelKey: "nav.mySessions", to: "/sessions" }`.
- Add `nav.mySessions` to `src/i18n/locales/*.json` (English first, mirror to the other 24 locales with the same key).
- New route `src/pages/Sessions.tsx` registered in `src/App.tsx` at `/sessions`. Page fetches the doctor's sessions and groups them into:
  - **Today** (open by default)
  - **Last 7 days** (collapsed)
  - **Last 30 days** (collapsed)
  - **Older** (collapsed)
- Uses the existing teal-bordered shadcn `Accordion` component (matches Patient Profile / My Practice accordions). Each row links to `/sessions/:id` (existing `SessionDetail.tsx`).

## 5. Always-visible task-row icons

`src/components/dashboard/CompactTodoList.tsx` line 471:

- Change `<div className="hidden group-hover:flex gap-0.5">` → `<div className="flex gap-0.5">` so the action icons (edit, complete, delete, etc.) are always rendered, not gated on hover.
- Keep the existing icon sizes; no layout reflow expected because the row already reserves the trailing column.

## Files touched

- `src/components/forms/PhoneNumberInput.tsx`
- `src/pages/MyPractice.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/pages/Sessions.tsx` (new)
- `src/App.tsx`
- `src/i18n/locales/*.json` (add `nav.mySessions`)
- `src/components/dashboard/CompactTodoList.tsx`

## Out of scope

Anything not listed above (translations of the new Sessions page beyond the nav label, partner-invite email branding, etc.) stays as-is and can be a follow-up.