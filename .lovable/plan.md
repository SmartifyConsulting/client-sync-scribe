# Replace "Vula Wallet" with "Vula Vault" + direct 6Dot50 launch

## Changes

### 1. Redeem tab card (`src/pages/patient/MyRewards.tsx` and `src/pages/doctor/DoctorRewards.tsx`)
- Rename the card title "Vula Wallet" → "Vula Vault".
- Update copy: "Sign in to your Vula Vault to redeem your Vulas at participating retailers."
- Change the button from `<Link to="/vula/wallet">` to a direct opener of `https://secure.6dot50.com/lite/default` in a new tab (`window.open(..., "_blank", "noopener,noreferrer")`).
- Button label: "Redeem at Vula Vault".
- Update the Transfer dialog `SelectItem` "My Vula Wallet" → "My Vula Vault" (both files).

### 2. `src/pages/VulaWallet.tsx` (the launcher page)
- Rename the page heading and references "Vula Wallet" → "Vula Vault".
- Component / route remain unchanged (still `/vula/wallet`) so deep links and the demo-overlay download UI keep working — only the visible label changes.

## Out of scope
- The route path itself, the Chrome extension package, and database labels stay.
- No backend changes.
