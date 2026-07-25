# Match Referral Doctors / Credentials / Sessions sub-tab headings to Hospital Admissions

## Reference style (Hospital Admissions)
`src/features/sessions/admissions/AdmissionsView.tsx:185-197`
- Header row: `<div className="flex items-center justify-between gap-2">`
- Title: `<h3 className="text-sm font-semibold text-foreground">Hospital Admissions</h3>`
- Right side: primary action buttons at `size="sm"` with icon.
- **No** surrounding `rounded-xl border border-primary bg-card p-4 shadow-sm` box — the section renders flat.

## Changes

### 1. Referral Doctors sub-tab (`src/pages/MyPractice.tsx` ~2291-2299)
Current:
```
<div className="rounded-xl border border-primary bg-card p-4 shadow-sm space-y-4">
  <div className="flex items-center gap-2">
    <Stethoscope className="h-4 w-4 text-primary" />
    <h3 className="text-base font-semibold text-primary-dark">Referral Doctors</h3>
  </div>
  <ReferralDoctors hideHeader />
</div>
```
New:
```
<div className="space-y-3">
  <div className="flex items-center justify-between gap-2">
    <h3 className="text-sm font-semibold text-foreground">Referral Doctors</h3>
    {/* Add Doctor button surfaces here from ReferralDoctors via a new right-slot render */}
  </div>
  <ReferralDoctors hideHeader />
</div>
```
- Drop the primary-bordered card frame and the icon.
- The existing "Add Doctor" button already lives inside `ReferralDoctors` (hideHeader branch) — keep it there; no action-slot lifting needed.

### 2. Credentials sub-tab (`src/pages/MyPractice.tsx` ~2303-2327)
Current wraps content in `rounded-xl border border-primary bg-card p-4 shadow-sm` with a `text-base font-semibold text-primary-dark` heading and the "Add Credential" button on its own row below the intro paragraph.
New:
- Remove the outer bordered frame; use `space-y-3` container.
- Header row becomes `flex items-center justify-between gap-2` with `<h3 className="text-sm font-semibold text-foreground">Credentials</h3>` on the left and the existing "Add Credential" `<Button size="sm">` on the right (mirroring Log Admission / Upload Admission Form placement).
- Move the "Track your professional credentials and CPD points." paragraph below the header row as a `text-xs text-muted-foreground` subtitle.

### 3. Sessions sub-tab
Confirm which "Sessions" screen the user means. Two candidates:
- `src/pages/MyPractice.tsx` "Sessions" tab (if present) — search shows no dedicated Sessions tab inside MyPractice; the app-level route is `/my-sessions` → `src/pages/MySessions.tsx`.
- `src/pages/MySessions.tsx` heading — currently `<h1 className="text-base font-semibold text-foreground">My Sessions</h1>`.

Update `src/pages/MySessions.tsx` header block to match the Hospital Admissions row format:
```
<div className="flex items-center justify-between gap-2 mb-3">
  <h3 className="text-sm font-semibold text-foreground">My Sessions</h3>
</div>
<p className="text-xs text-muted-foreground mb-4">Browse your consultation sessions grouped by date.</p>
```
(Downgrade `<h1>` to `<h3>` and `text-base` → `text-sm` so it visually matches Hospital Admissions.)

## Technical notes
- Presentation-only changes in `src/pages/MyPractice.tsx` and `src/pages/MySessions.tsx`.
- No colour scheme changes; existing tokens only.
- No changes to the child components (`ReferralDoctors`, credentials form logic, session list).
