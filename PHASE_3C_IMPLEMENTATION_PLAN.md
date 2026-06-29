# Phase 3C Implementation Plan
## Critical Pages & Legal Screens - Full i18n Coverage

**Date:** 2026-06-29  
**Scope:** 40 critical pages + legal screens  
**Status:** Starting Implementation  
**Estimated Duration:** 40 hours  
**Testing:** 2-language validation (Spanish + French)

---

## Phase 3C Overview

Phase 3C focuses on **user-blocking screens** that prevent international users from accessing the platform:

### Priority Tiers

**TIER 1: BLOCKING (MUST DO FIRST)**
1. ✅ src/pages/Auth.tsx (1,193 lines) - Login screen
2. ✅ src/pages/ForgotPassword.tsx (319 lines) - Password recovery
3. ✅ src/pages/ResetPassword.tsx (216 lines) - Password reset
4. ✅ src/pages/Notifications.tsx (851 lines) - Daily feature
5. ✅ src/pages/Sessions/SessionDetail.tsx (805 lines) - Core feature
6. ✅ src/pages/Profile.tsx (308 lines) - User profile
7. ✅ src/pages/ProviderSignup.tsx (340 lines) - Provider onboarding

**TIER 2: LEGAL (REQUIRED)**
8. ✅ src/pages/PatientConsent.tsx (491 lines)
9. ✅ src/pages/TermsAndConditions.tsx (449 lines)
10. ✅ src/pages/BusinessAssociateAgreement.tsx (381 lines)

**TIER 3: PATIENT FEATURES (HIGH PRIORITY)**
11. ✅ src/pages/patient/MyDetails.tsx (181 lines)
12. ✅ src/pages/patient/MyDoctors.tsx (623 lines)
13. ✅ src/pages/patient/PatientAccessManagement.tsx (482 lines)
14. ✅ src/pages/patient/PatientTasks.tsx (596 lines)
15. ✅ src/pages/patient/HealthAlbum.tsx (358 lines)
16. ✅ src/pages/patient/Invoices.tsx (506 lines)
17. ✅ src/pages/patient/PrescriptionHistory.tsx (253 lines)

**TIER 4: DOCTOR FEATURES (HIGH PRIORITY)**
18. ✅ src/pages/doctor/Invoices.tsx (1,913 lines)
19. ✅ src/pages/Connections.tsx (549 lines)
20. ✅ src/pages/ReferralDoctors.tsx (495 lines)

**TIER 5: ADMIN & MISC**
21-40. [Additional admin, vula wallet, cpd, etc.]

---

## Phase 3C Translation Keys Structure

### Authentication & Account

```json
{
  "auth": {
    "login": {
      "title": "Login",
      "email": "Email Address",
      "password": "Password",
      "rememberMe": "Remember me",
      "signIn": "Sign In",
      "noAccount": "Don't have an account?",
      "signUp": "Sign up here",
      "invalidCredentials": "Invalid email or password",
      "accountLocked": "Account locked. Please try again later."
    },
    "signup": {
      "title": "Create Account",
      "firstName": "First Name",
      "lastName": "Last Name",
      "email": "Email Address",
      "password": "Password",
      "confirmPassword": "Confirm Password",
      "agreeTerms": "I agree to the Terms and Conditions",
      "create": "Create Account",
      "haveAccount": "Already have an account?",
      "signIn": "Sign in here"
    },
    "forgot": {
      "title": "Forgot Password?",
      "instructions": "Enter your email address to reset your password",
      "email": "Email Address",
      "submit": "Send Reset Link",
      "checkEmail": "Check your email for reset instructions"
    },
    "reset": {
      "title": "Reset Password",
      "newPassword": "New Password",
      "confirmPassword": "Confirm Password",
      "reset": "Reset Password",
      "success": "Password reset successfully"
    }
  },
  "notifications": {
    "title": "Notifications",
    "unread": "Unread",
    "markAsRead": "Mark as Read",
    "clearAll": "Clear All",
    "noNotifications": "No notifications",
    "appointmentReminder": "Appointment Reminder",
    "messageReceived": "New Message",
    "medicationReminder": "Medication Reminder",
    "documentAvailable": "Document Available"
  },
  "profile": {
    "title": "My Profile",
    "personalInfo": "Personal Information",
    "contactInfo": "Contact Information",
    "preferences": "Preferences",
    "privacy": "Privacy Settings",
    "securitySettings": "Security Settings",
    "edit": "Edit Profile",
    "save": "Save Changes",
    "changePassword": "Change Password",
    "logout": "Log Out",
    "deleteAccount": "Delete Account"
  }
}
```

### Patient Features

```json
{
  "patient": {
    "myDetails": {
      "title": "My Details",
      "personalInfo": "Personal Information",
      "emergencyContact": "Emergency Contact",
      "medicalHistory": "Medical History",
      "allergies": "Allergies",
      "medications": "Current Medications",
      "conditions": "Medical Conditions"
    },
    "myDoctors": {
      "title": "My Doctors",
      "addDoctor": "Add Doctor",
      "removeDoctor": "Remove Doctor",
      "viewProfile": "View Profile",
      "contactDoctor": "Contact Doctor",
      "noDoctors": "No doctors yet"
    },
    "healthAlbum": {
      "title": "Health Album",
      "uploadPhoto": "Upload Photo",
      "deletePhoto": "Delete Photo",
      "noPhotos": "No photos yet"
    },
    "invoices": {
      "title": "My Invoices",
      "viewInvoice": "View Invoice",
      "downloadInvoice": "Download Invoice",
      "payInvoice": "Pay Invoice",
      "invoiceStatus": "Invoice Status"
    },
    "prescriptions": {
      "title": "Prescription History",
      "viewPrescription": "View Prescription",
      "downloadPrescription": "Download Prescription",
      "refillPrescription": "Refill Prescription"
    }
  }
}
```

### Legal & Consent

```json
{
  "legal": {
    "termsAndConditions": {
      "title": "Terms and Conditions",
      "acceptTerms": "I accept the Terms and Conditions",
      "reject": "Reject",
      "accept": "Accept"
    },
    "privacyPolicy": {
      "title": "Privacy Policy",
      "viewPolicy": "View Privacy Policy"
    },
    "patientConsent": {
      "title": "Patient Consent",
      "consentText": "I consent to the treatment outlined above",
      "providerInfo": "Provider Information",
      "treatmentInfo": "Treatment Information",
      "accept": "Accept Consent",
      "decline": "Decline"
    },
    "businessAssociate": {
      "title": "Business Associate Agreement",
      "agree": "I agree to the Business Associate Agreement"
    }
  }
}
```

---

## Implementation Strategy

### Batch 1: Authentication (3-4 hours)
- [ ] Auth.tsx - Login screen
- [ ] ForgotPassword.tsx - Password recovery
- [ ] ResetPassword.tsx - Password reset
- [ ] ProviderSignup.tsx - Provider signup

**Output:** Users can login in any of 25 languages

### Batch 2: Legal & Compliance (2-3 hours)
- [ ] PatientConsent.tsx - Legal requirement
- [ ] TermsAndConditions.tsx - Legal requirement
- [ ] BusinessAssociateAgreement.tsx - Legal requirement

**Output:** Full legal compliance in all languages

### Batch 3: Notifications & Core (3-4 hours)
- [ ] Notifications.tsx - Daily feature
- [ ] SessionDetail.tsx - Core feature
- [ ] Profile.tsx - User profile

**Output:** Core user features available in all languages

### Batch 4: Patient Features (8-10 hours)
- [ ] MyDetails.tsx, MyDoctors.tsx, HealthAlbum.tsx
- [ ] Invoices.tsx, PrescriptionHistory.tsx
- [ ] PatientAccessManagement.tsx, PatientTasks.tsx

**Output:** Complete patient experience in all languages

### Batch 5: Doctor & Admin Features (8-10 hours)
- [ ] Doctor Invoices, Connections, ReferralDoctors
- [ ] Admin panels and supporting screens

**Output:** Complete provider experience in all languages

### Batch 6: Misc Features (4-5 hours)
- [ ] VulaWallet, CPDCertificates, ExpiringRecordings
- [ ] Additional utility screens

---

## Phase 3C Success Criteria

✅ All 40 pages have useTranslation hooks  
✅ All UI strings replaced with t() calls  
✅ All 25 language files have Phase 3C keys  
✅ Spanish translation tested (100% on all pages)  
✅ French translation tested (100% on all pages)  
✅ No English text visible in non-English modes  
✅ Legal pages fully translated (compliance requirement)  
✅ Login flow works in all 25 languages  
✅ No console errors  

---

## Rollout Strategy

**After Phase 3C Complete:**
1. Deploy to staging with language selector enabled
2. Test with international team members
3. Deploy to production
4. Monitor for missing translations (fallback to English)
5. Proceed to Phase 4 (42 remaining module files)

---

## Timeline

| Phase | Task | Duration | Status |
|-------|------|----------|--------|
| 3C-1 | Auth & Signup | 4h | ⏳ Starting |
| 3C-2 | Legal Screens | 3h | ⏳ Next |
| 3C-3 | Notifications/Core | 4h | ⏳ Next |
| 3C-4 | Patient Features | 10h | ⏳ After 3C-3 |
| 3C-5 | Doctor/Admin | 10h | ⏳ After 3C-4 |
| 3C-6 | Misc Features | 5h | ⏳ After 3C-5 |
| Testing | Validation | 2h | ⏳ After 3C-6 |
| **Total** | | **40h** | |

---

## Next Steps

1. ✅ Create Phase 3C translation keys in all 25 language files
2. ✅ Implement Batch 1 (Auth screens) - STARTS NOW
3. ✅ Test Spanish/French on auth flow
4. ✅ Proceed to remaining batches

**Phase 3C Ready to Launch** 🚀
