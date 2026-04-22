

# Plan: Tablet logo collision, remove duplicate Admissions, restyle Vula explainer

## 1. Fix Vula logo overlap on tablet/web banner

**File:** `src/components/patients/PatientDetailsEditor.tsx` (lines 1077–1097)

The greeting `<h3>` uses `whitespace-nowrap`, which forces "Good evening, Sarah" + the date column to push into the inline Vula logo at tablet widths (~936px content area), producing the overlap shown in the screenshot.

Fix:
- Remove `whitespace-nowrap` from the `<h3>` so the greeting can wrap if needed.
- Add `shrink-0` to the inline Vula wrapper (line 1090) so it never gets squeezed by the flex middle column, and bump its left margin (`ml-auto`) so it stays clearly separated from the greeting block.
- Reduce the inline tablet/web Vula logo from `h-12` → `h-10` so it sits proportionally next to the 80px avatar without dominating.

```tsx
<h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
  ...
</h3>
...
{!rewardsLoading && lollipopCount !== undefined && (
  <div className="hidden md:flex shrink-0 items-end gap-2 pb-1 ml-auto">
    <img src={vulaVouchersLogo} alt="Vula Vouchers" className="h-10 w-auto object-contain" />
    <span className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">
      <AnimatedCounter target={lollipopCount} />
    </span>
  </div>
)}
```

## 2. Remove duplicate "Admissions" tab from patient menu

**File:** `src/components/patients/PatientDetailsEditor.tsx`

Two issues stack to produce the duplicate:

1. `SECTION_TABS` (lines 311–316) has a stray standalone `admissions: ["admissions"]` section in addition to `hospital_visits` already living inside `care` (My Holarchy).
2. The tab strip (lines 1270–1274) renders an extra "Admissions" trigger via `show("admissions")`.

Fix:
- Delete the `admissions: ["admissions"]` line from `SECTION_TABS`. Admissions remains accessible exclusively via My Holarchy → "Admissions" tab (which is already wired through `hospital_visits` at line 1245).
- Remove the standalone `admissions` `<TabsTrigger>` block (lines 1270–1274) and any matching `<TabsContent value="admissions">` block (verify and remove if present).
- The `hospital_visits` tab keeps its display label "Admissions" (line 1247), so users still see the word "Admissions" in the right place — just only once, under My Holarchy.

## 3. Restyle "Welcome to Vula Vouchers" dialog to match reference image

**File:** `src/components/rewards/VulaExplainerDialog.tsx`

Rebuild the dialog to match the uploaded reference exactly:

- **Background:** Drop the blue gradient hero. Use a single light/white card surface (`bg-white` / `bg-card`) for the entire dialog — matches the reference's clean white background.
- **Top:** Centered Vula Vouchers logo (existing `vula-vouchers-logo-v2.png`) at `h-32`, no surrounding gradient block. Keep the close (×) in the top-right as a subtle white circle with grey border.
- **Headline (replaces "Welcome to Vula Vouchers"):** Two-line headline matching the image:
  - Line 1: "Vula means rain in" — bold black
  - Line 2: "isiZulu and isiXhosa –" — bold, blue→teal gradient text
  - Then a centered subtitle in regular grey: "something you can't always predict, but always need."
- **Divider:** Horizontal hairline with a centered blue water-drop icon (`Droplet` from lucide) — matches the reference's dropdown rule.
- **Section 1 — "Vulas reward real-world actions":** Two-column row with a circular light-blue icon badge (`Users` icon) on the left and the body text on the right. Bold heading line, then "helping, sharing, contributing, and following through." Final italic-feel teal line: "It's how we show up for each other."
- **Hairline divider.**
- **Section 2 — "Vulas are a simple way to start building value that grows with you.":** Same two-column layout with a circular light-blue icon badge (`TrendingUp` icon). Subtext: "Small actions today. Bigger impact tomorrow."
- **CTA Button:** Full-width gradient button (blue→teal, exact same gradient as today), with a ticket/voucher icon (`Ticket` from lucide) on the left of the label "Earn Vulas". Rounded-xl, large.
- **Footer tagline:** Below the button, centered small line with a blue heart emoji-style icon (`Heart` from lucide, filled gradient blue) followed by "Earn them. Use them. Keep them." in regular grey text.
- **Typography:** Use existing app sans font. Keep headlines `font-bold`, body `font-normal text-foreground/80`, gradient lines using `bg-gradient-to-r from-blue-500 to-teal-500 bg-clip-text text-transparent`.
- **Spacing:** Generous vertical padding (`p-8`), `space-y-6` between sections to mirror the airy reference layout.
- **Imports:** Add `Droplet`, `Users`, `TrendingUp`, `Ticket`, `Heart` from lucide. Remove the unused `CloudRain` import.

The dialog stays the same component (same props, same first-launch localStorage logic) — only its visual layout changes.

## Files touched

| File | Change |
|---|---|
| `src/components/patients/PatientDetailsEditor.tsx` | Banner: drop `whitespace-nowrap` on greeting `<h3>`, make inline Vula wrapper `shrink-0 ml-auto`, logo `h-12` → `h-10`. Tabs: remove `admissions` key from `SECTION_TABS`; delete the standalone `admissions` `<TabsTrigger>` (and matching `<TabsContent>` if present) |
| `src/components/rewards/VulaExplainerDialog.tsx` | Full visual rebuild on white background to match reference: centered Vula logo, two-line gradient headline, drop-icon divider, two icon-badge sections, gradient "Earn Vulas" CTA with ticket icon, heart-prefixed tagline footer |

## Out of scope
- Doctor-side tabs (no Admissions tab in doctor view).
- Vula explainer first-launch localStorage logic (unchanged).
- Mobile-only Vula row in the banner (already correct, kept as-is).

