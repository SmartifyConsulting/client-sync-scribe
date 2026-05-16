## Redeem tab — simplify to single Vault card

Scope: `src/pages/patient/MyRewards.tsx`, Redeem tab.

### Changes
1. **Remove the "What are Vulas" inline frame** entirely (drop the left-column `<Card>` with `<VulaExplainerContent />`). Also remove the `VulaExplainerContent` import.
2. **Drop the side-by-side grid wrapper** — only one card remains, render it directly.
3. **Crop the vendors image** so the top "VULA VOUCHERS 250" header is hidden, showing only the merchant logo grid. Wrap the `<img>` in `<div className="overflow-hidden">` and apply `object-top` + a negative `margin-top` (approx `-mt-[18%]`) so only the lower merchant-grid portion shows. Tune the crop ratio after visual QA.
4. **Add info (i) icon top-right of Vula Vault card** — small `Info` button (`absolute top-3 right-3`) that opens the existing `VulaExplainerDialog` (state already wired via `showVulaExplainer`). `aria-label="What are Vulas?"`.
5. Vault card itself becomes `relative` to anchor the absolute info button.

### Unchanged
- Vault logo, 2000-Vula unlock gate, progress bar, button + 6Dot50 link.
- `VulaExplainerDialog` itself stays (already opened from elsewhere too).

### Verification
- Mobile (390px) and desktop (1504px): only one card visible on Redeem; merchant grid renders without the "VULA VOUCHERS 250" header band; info icon top-right opens the explainer dialog.
