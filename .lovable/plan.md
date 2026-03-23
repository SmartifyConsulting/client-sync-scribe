

# Plan: Create My Practice Page, Restructure Settings, Add Doctor Rewards

## Summary of Changes

1. **New "My Practice" page** (`/practice`) with tabs: Personal, Practice, Referrals, Pricing, Certificates — content moved from Settings
2. **New sidebar items** for doctors: "My Practice" (under My Holarchive) and "My Rewards" (under My Practice)
3. **Settings restructured**: Remove doctor-only tabs; add Preferences as first tab with Digital Signatures; merge Data into Security; replace Billing sub-tabs with two frames
4. **Move Details content to My Practice**: The "Details" sub-tab (first name, last name, email, mobile, specialty, mailbox) currently under Settings → Personal → Details moves to the **Personal tab** of the new My Practice page

## Detailed Changes

### 1. Sidebar (`src/components/layout/Sidebar.tsx`)

Update `doctorNavItems` order:
- Dashboard → /dashboard
- My Holarchive → /profile
- **My Practice → /practice** (new, icon: Briefcase)
- **My Rewards → /doctor/rewards** (new, icon: Gift)
- My Patients → /patients
- Calendar → /calendar
- Sessions → /sessions
- To-Do List → /todos
- Invoices → /invoices
- Templates → /documents

### 2. New Page: My Practice (`src/pages/MyPractice.tsx`)

5 tabs: **Personal, Practice, Referrals, Pricing, Certificates**

- **Personal tab**: Contains the Details content moved from Settings — first name, last name, email, mobile number, specialty, mailbox section. Also includes the profile picture/avatar upload card from Settings header.
- **Practice tab**: Practice number, registration, address, logo, partners (moved from Settings)
- **Referrals tab**: `<ReferralDoctors />` (moved from Settings)
- **Pricing tab**: Currency + service prices (moved from Settings)
- **Certificates tab**: CPD certificates (moved from Settings)

### 3. Settings Page Restructure (`src/pages/Settings.tsx`)

**Remove**: Personal tab (Details moved to My Practice, Preferences becomes standalone tab), Practice, Referrals, Pricing, Certificates tabs

**New tab order:**
1. **Preferences** (first tab) — Content from old Personal → Preferences sub-tab (auto-email toggles, patient management, language/voice, calendar integration). **Add Digital Signature section** (moved from Practice tab)
2. **Notifications** — Keep as-is
3. **Security** — Keep 2FA + password. **Add Data Management frame below** (merged from Data tab)
4. **Billing** — Remove sub-tabs. Two distinct frames: Subscription frame and Payment History frame

### 4. Routes (`src/App.tsx`)

Add:
- `<Route path="/practice" element={<MyPractice />} />`
- `<Route path="/doctor/rewards" element={<MyRewards />} />` (reuse patient rewards or create doctor-specific)

### 5. Doctor Rewards Page

Route `/doctor/rewards` to a page showing Moolas content (moved from Settings).

## Files Modified

| File | Change |
|------|--------|
| `src/components/layout/Sidebar.tsx` | Add "My Practice" and "My Rewards" nav items |
| `src/pages/MyPractice.tsx` | **NEW** — 5-tab page with Details + Practice content from Settings |
| `src/pages/Settings.tsx` | Remove doctor tabs + Details; restructure to Preferences → Notifications → Security (+Data) → Billing (two frames) |
| `src/App.tsx` | Add routes for `/practice` and `/doctor/rewards` |

