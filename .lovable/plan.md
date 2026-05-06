# Legal spacing fix + Rewards/Redeem cleanup

## 1. Legal page — fix touching frames
In `src/pages/Legal.tsx` the cards look glued together because each `<li>` has `!m-0`, which cancels the `space-y-4` selector (`& > * + *`) inherited by the list. Article-body CSS in `LegalDocLayout` also re-injects bullet dots and list margins.

Fix:
- Switch the list to `flex flex-col gap-5` (gap is not killed by `!m-0`).
- Add `list-none [&>li]:before:hidden` and an inline override class so `article.legal-body ul/li` defaults don't re-add bullets or extra margin.
- Keep the existing card styling (border, shadow-sm, hover lift). Slightly increase card padding to `p-5 md:p-6` and add `rounded-xl` for breathing room.

## 2. My Rewards (`src/pages/patient/MyRewards.tsx`)

**a. Hero stats — turn "Redeemed" card into "Vula Vault"**
- Rename label "Redeemed" → "Vula Vault".
- Replace the `ArrowRightLeft` icon with the `vula-symbol` (or a vault-style icon like `Vault` from lucide).
- The card's footer button "Redeem Vulas" now opens the Transfer dialog with destination preset to `vault` (clicking the card or button auto-selects Vault).
- Number shown stays as `totalTransferred` since that already represents Vulas moved out (acts as the Vault balance proxy for the demo).

**b. Redeem tab — remove the standalone Vula Vault card**
- Delete the entire `{/* Transfer to Vula Vault */}` `<Card>` block (lines 819–836).
- Vault access is now exclusively driven by the hero "Vula Vault" card above.

**c. Redeem tab — remove "Sync Vula retailers" button**
- In the empty-state branch of "Approved Vula Partner Apps", remove the `<Button onClick={…sync-vula-partner-apps…}>` and the explanatory paragraph that promotes syncing.
- Replace with a simple muted message: "No partner retailers connected yet. Check back soon."

## Out of scope
- No backend / RLS / edge function changes.
- Transfer dialog logic itself stays as-is — only the entry points change.
