# Simplify Redeem tab

In `src/pages/patient/MyRewards.tsx`, the Redeem tab currently shows two cards:
1. **Vula Wallet** card (link to `/vula/wallet`)
2. **Approved Vula Partner Apps** card (grid of partner retailers + transfer buttons)

## Change

Keep only the **Vula Wallet** card. Remove the entire "Approved Vula Partner Apps" `<Card>` block (~lines 758–817) so the Redeem tab contains a single, focused CTA to open the Vula Wallet.

## Out of scope

- Partner-apps data fetching (`useQuery(["vula-partner-apps"])`) and transfer logic stay intact — they're still used by the Transfer dialog and aren't worth removing.
- No backend changes.
