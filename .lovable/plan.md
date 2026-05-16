## Redeem tab — side-by-side layout

In `src/pages/patient/MyRewards.tsx`, change the Redeem tab (`TabsContent value="transfers"`) from stacked to a 2-column grid on desktop.

### Change
- Wrap the two existing cards in `<div className="grid gap-6 md:grid-cols-2 items-start">`.
- **Left column**: "What are Vulas" inline explainer card (unchanged content).
- **Right column**: Vula Vault brand card with logo, vendors image, unlock gate (unchanged content/logic).
- On mobile (`<768px`), they stack naturally (single column).
- Keep `items-start` so unequal heights don't stretch either card.
- No changes to internal content, the 2000-Vula gate, or the 6Dot50 button behavior.

### Verification
- Visual check at 1504px (current viewport): two cards render side-by-side, equal width.
- Mobile width: cards stack with What-are-Vulas on top.
