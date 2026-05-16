## Redeem tab cleanup

In `src/pages/patient/MyRewards.tsx`, Redeem tab:

1. **Remove the top frame** — delete the inline "What are Vulas" Card that renders `<VulaExplainerContent hideCta />` (added in the previous change). Also remove the now-unused `VulaExplainerContent` import.
2. **Remove the Vula 250 image inside the Vula Vault card** — delete the `<img src={vulaVaultLogo} ... />` element (and its wrapper if it becomes empty). Remove the now-unused `vulaVaultLogo` import and the `src/assets/vula-vault-logo.png` asset file.
3. Keep everything else in the Vula Vault card intact: headline, vendors image, progress bar + unlock message, gated "Redeem at Vula Vault" button (2,000 Vula threshold).

Result: Redeem tab shows a single frame — the Vula Vault card without the large logo at top.

No backend, data, or styling-token changes.

**Verification:** Visit `/patient/rewards` → Redeem tab at 1504px and mobile widths to confirm only the Vula Vault card renders, the logo is gone, and the unlock gate still works.