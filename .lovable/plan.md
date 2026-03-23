

# Plan: Consolidate Profile into Settings

## Summary
Move ALL content currently in Profile.tsx into the Settings screen. Profile.tsx for patients will remain as the Holarchive view only. For doctors, Profile.tsx will redirect to Settings (or show just the Holarchive if they have a patient record).

## Settings.tsx — New Tab Structure

Replace the current 7 tabs with a comprehensive set that includes all Profile.tsx doctor tabs:

**Personal** | **Practice** | **Partners** | **Patients** | **Referrals** | **Pricing** | **Certificates** | **Moolas** | **Preferences** | **Calendar** | **Notifications** | **Security** | **Billing** | **Data**

- Tabs left-aligned (add `justify-start` to TabsList)
- Profile picture (avatar upload with camera overlay) added to the Personal tab header
- Profile auto-save indicator ("Saving..." / "Saved") added to the page header
- **Personal tab**: First/Last name, email (with admin edit), mobile number, specialty, mailbox section — merged from both Profile.tsx and current Settings.tsx
- **Practice tab** (doctor only): Practice number, registration number, address, logo upload, digital signature settings (font, color, size, bold/italic), country, language, narration voice with preview
- **Partners tab** (doctor only): Partner management (add/edit/remove/invite)
- **Patients tab** (doctor only): Patient import via PatientImport component
- **Referrals tab** (doctor only): Embeds ReferralDoctors component
- **Pricing tab** (doctor only): Service prices with currency management
- **Certificates tab** (doctor only): CPD certificates management with total points badge
- **Moolas tab** (doctor only): DoctorMoolasTab component
- **Preferences tab**: Patient auto-email toggles + doctor Patient Management (inactive threshold) — already exists
- **Calendar/Notifications/Security/Billing/Data**: Keep as-is

For patients, doctor-only tabs are hidden. Patients see: Personal, Preferences, Calendar, Notifications, Security, Billing, Data.

## Profile.tsx — Simplified

- For **patients**: Keep as-is (Holarchive view with PatientDetailsEditor + auto-create fallback)
- For **doctors**: Remove the tabbed layout entirely. Show only the profile picture card + a message/link directing to Settings for account management. Or, if doctors also have a patient record, show their Holarchive. Otherwise show a simple redirect card to Settings.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Settings.tsx` | Add all Profile.tsx doctor tabs (Practice, Partners, Patients, Referrals, Pricing, Certificates, Moolas); left-align tabs; add avatar upload to Personal tab; add signature/language/voice to Practice tab; move helper functions (MailboxSection, DoctorMoolasTab, formatPhoneNumber) |
| `src/pages/Profile.tsx` | Remove doctor tab layout; simplify to Holarchive-only view for patients; redirect/link to Settings for doctors; remove moved helper components |

## Technical Notes

- All state, constants (SIGNATURE_FONTS, SIGNATURE_COLORS, CURRENCIES, LANGUAGES, SAMPLE_TEXTS, DOCTOR_SPECIALTIES, COUNTRY_CODES), and helper functions/components (MailboxSection, DoctorMoolasTab, formatPhoneNumber, AutoEmailToggle) will be moved from Profile.tsx to Settings.tsx
- The debounced auto-save pattern from Profile.tsx for form fields will be replicated in Settings.tsx
- Doctor-only tabs conditionally rendered based on `role === "doctor"`
- CPD points badge shown in the page header for doctors (same as current Profile.tsx)

