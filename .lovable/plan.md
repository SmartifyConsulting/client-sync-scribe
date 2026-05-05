## Changes

### 1. Spacing on Accept Patient Request dialog
`src/components/doctor/DoctorAccessRequests.tsx` (line 364): give the `DialogFooter` a `gap-2` so the **Cancel** and **Accept Request** buttons don't touch on mobile (where they stack/wrap).

### 2. SOS button fits within the nav bar
`src/components/layout/BottomNav.tsx`: replace the oversized "breakout" SOS treatment with a button that sits inside the nav bar like the others. It will be a solid red circle (~40px) with a small white siren icon and the white text "SOS" rendered **inside** the circle. Drop the `-mt-6`, the outer ring shadow, and the bold red label below the bar — both doctor and patient nav arrays use the same `danger` render path so this fix covers both.

### 3. Rename "Transfers" tab → "Redeem" and rework the tab content

**Patient (`src/pages/patient/MyRewards.tsx`)** and **Doctor (`src/pages/doctor/DoctorRewards.tsx`)**:

- Tab trigger label changes from `Vulas` / `Transfers` to **`Redeem`** (keep `value="transfers"` internally so existing state/links keep working).
- Inside the `transfers` TabsContent, restructure to **three** sections in this order:
  1. **Redeem from 6Dot50 with Vula Vouchers** (new, placed **above** Partner Apps)
     - Card with short copy: "Redeem your Vulas at retailers in the 6Dot50 network."
     - Primary button **Redeem** that opens `https://portal.6dot50.com/` in a new tab (`window.open(url, "_blank", "noopener")`).
  2. **Approved Vula Partner Apps** (existing card, unchanged content)
  3. **Transfer to Vula Vault** (new card)
     - Short copy: "Move your Vulas to the Vula Vault for safekeeping."
     - Button **Transfer to Vault** opens the existing transfer dialog with a synthetic `transferToAppId = "vault"`. `handleTransfer` will branch: when id === "vault", insert a `patient_rewards` ledger row with `visit_category: "Vula Vault"` and skip the partner-app FK. Doctor version mirrors the same logic.
- **Remove the Transfer History card** entirely from both pages.

### 4. Rename "Transferred" balance card → "Redeemed"
- `src/pages/patient/MyRewards.tsx` line 431: change the label `Transferred` → `Redeemed` (variable `totalTransferred` keeps its name internally).
- `src/pages/doctor/DoctorRewards.tsx` line 197: same change.
- The "Transfer Vulas" small action link below each card stays but its label becomes **"Redeem Vulas"** and opens the same transfer dialog (so users can redeem from the balance card too).

### 5. Memory
Add a small new memory `mem://features/vula-redemption` noting: Vula redemption tab is "Redeem"; Redeem button deep-links to `https://portal.6dot50.com/`; Vula Vault is a virtual partner app id `"vault"` recorded as a `patient_rewards` ledger entry; "Transferred" card is labeled "Redeemed".

## Files

- **Edit:** `src/components/doctor/DoctorAccessRequests.tsx`
- **Edit:** `src/components/layout/BottomNav.tsx`
- **Edit:** `src/pages/patient/MyRewards.tsx`
- **Edit:** `src/pages/doctor/DoctorRewards.tsx`
- **Memory:** new `mem://features/vula-redemption` + index update

## Out of scope

- No real 6Dot50 API integration — still awaiting endpoint URL/credentials. The Redeem button just deep-links to the portal for now.
- No DB migration: the Vault transfer is recorded as a `patient_rewards` ledger entry; no new table.
