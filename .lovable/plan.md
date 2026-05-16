## Redeem tab — swap vendors image and add Vula Vault logo

In `src/pages/patient/MyRewards.tsx` Vula Vault card:

1. **Add new assets**:
   - Copy `user-uploads://VulaVaultLogo-3.png` → `src/assets/vula-vault-logo.png`
   - Copy `user-uploads://Merchants.png` → `src/assets/vula-vault-merchants.png` (replaces the current `vula-vault-vendors.png` usage)

2. **Place Vula Vault logo at top of frame**: Inside the existing `CardHeader`, add an `<img>` of the new logo (`h-28 md:h-36 w-auto object-contain mx-auto`) above the existing `CardDescription`.

3. **Replace vendors image with merchants image**: Swap the import to `vulaVaultMerchants` from the new file and update the `<img src>` and alt text accordingly. Remove the small caption "Use your Vulas at these participating retailers." since the merchants image already has its own header.

4. **Remove the Vula count UI**: Delete the entire progress/count block — the `isUnlocked ? "unlocked!" : Earn N more...` paragraph, the `<Progress>` bar, and the `{lollipopCount} / {THRESHOLD} Vulas` line. Keep the gated "Redeem at Vula Vault" button and its lock/unlock label intact (button still uses `VAULT_UNLOCK_THRESHOLD = 2000` to disable + show "Locked — 2,000 Vulas required").

5. **Cleanup**: Remove unused `Progress` import if no longer used elsewhere in this file; remove the old `vula-vault-vendors.png` asset and its import.

**Result**: Frame shows → Vula Vault logo → tagline → Merchants image → gated Redeem button. No numeric count visible.

**Verification**: Visit `/patient/rewards` → Redeem tab at 1504px and mobile; confirm logo renders crisply at top, merchants image replaces vendors, no progress bar/count, button still gates at 2,000 Vulas.