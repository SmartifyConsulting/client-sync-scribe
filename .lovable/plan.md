## Goal

Collapse the footer to a single horizontal line containing the copyright, legal links, and Contact Support, and shrink the footer's height so it tightly fits that one line. The sidebar (capped at `100vh − var(--footer-height)`) will automatically follow.

## Changes

### 1. `src/components/layout/Footer.tsx`
Replace the stacked layout (three rows: copyright / legal nav / support) with one flex row:

- Outer `<footer>`: keep `border-t border-border bg-card/50 h-[var(--footer-height)] flex items-center`.
- Inner container: keep `md:ml-[var(--sidebar-width)] w-full`.
- Inside: one `<div className="max-w-7xl mx-auto px-4 md:px-8 w-full flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">` containing, in order, separated by `·` dots:
  1. `© {year} Holarc Health (Pty) Ltd. All rights reserved.`
  2. Terms and Conditions
  3. Privacy & Consent
  4. Compliance
  5. Legal Center
  6. Contact Support (with the `LifeBuoy` icon, mailto link, primary hover)

Remove the old `space-y-3`, the separate nav block, and the separate Contact Support block.

### 2. `src/index.css`
Reduce `--footer-height` from `132px` to `44px` so the bar tightly fits one line of `text-xs` content with comfortable vertical padding. This also raises the sidebar's bottom edge to meet the new, thinner footer divider.

## Out of scope
- No changes to mobile (footer is hidden under `md`; mobile support link stays as-is).
- No changes to sidebar markup — it already reads `--footer-height`.
