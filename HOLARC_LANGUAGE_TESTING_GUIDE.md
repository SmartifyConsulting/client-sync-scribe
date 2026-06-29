# Holarc Health Language (i18n) Testing Guide

**Version:** 1.0  
**Created:** 2026-06-29  
**Purpose:** Comprehensive testing framework for all language/i18n features

## Overview

This guide ensures complete validation of internationalization implementation. Do NOT report features as complete until ALL items in the applicable section are verified.

---

## PART 1: CODE VERIFICATION

- [ ] Read the complete target file and verify EVERY hardcoded string has been replaced with t() calls
- [ ] Verify all related language files have all translation keys
- [ ] Verify all 25 language files exist and contain required keys:
  - [ ] en, af, zu, xh, sn, sw, ha, ig, ar, de, el, es, fr, he, hi, it, ja, ko, nl, pl, pt, ru, tr, yo, zh
- [ ] Build the project with `npm run build` and verify it compiles without errors
- [ ] Check for any TypeScript errors or warnings related to the i18n changes
- [ ] Verify no console errors in development build

---

## PART 2: DEV SERVER VERIFICATION

- [ ] Dev server running at http://localhost:8080
- [ ] Server responds to HTTP requests
- [ ] Check browser console for errors or warnings
- [ ] Verify no 404s for translation files or assets
- [ ] Verify app loads without crashing

---

## PART 3: FUNCTIONAL TESTING - SCREEN SPECIFIC

For each target screen, test with ALL 25 languages:

### PatientDashboard.tsx
Required translated strings:
- [ ] "Welcome back" greeting
- [ ] "Your health dashboard at a glance" subtitle
- [ ] "Calendar" button text
- [ ] "Record Task" button text
- [ ] "Recent Activity" header
- [ ] "AI Health Summary" card title
- [ ] "Upcoming Appointments" card title
- [ ] "My Vula Vouchers" label
- [ ] "Earn More Vulas" title
- [ ] "Recent Claims" card title
- [ ] "Assigned Tasks" card title
- [ ] All button labels and descriptions

### MyPractice.tsx
Required translated strings:
- [ ] Tab labels: Profile, Services, Schedule, Patients, Invoices, Referrals, Round Tables, Rewards, Documents, Hospital Affiliations
- [ ] Button labels: Save, Cancel, Add Service, Edit, Delete
- [ ] Form labels: Full Name, Email, Phone, Specialty
- [ ] Section headers and descriptions
- [ ] Error messages

### PatientDocuments.tsx
Required translated strings:
- [ ] "My Documents" title
- [ ] "Upload Document" button
- [ ] "Download", "Delete", "Share" actions
- [ ] "No documents yet" empty state
- [ ] Upload modal strings
- [ ] Filter and sort options

---

## PART 4: LANGUAGE SWITCHING VERIFICATION

For each language switch test:
- [ ] Language selector is accessible
- [ ] Switching to language X shows all text in language X
- [ ] NO English text appears when in other languages
- [ ] Translation is instant (no page reload)
- [ ] Language persists when navigating between screens
- [ ] Can switch back to English
- [ ] Can switch between non-English languages
- [ ] RTL languages (ar, he) display correctly
- [ ] Long translations (de, es) don't overflow

---

## PART 5: EDGE CASES & ERROR HANDLING

- [ ] RTL languages (Arabic, Hebrew) - layout doesn't break
- [ ] Long translations (German, Spanish) - text doesn't overflow
- [ ] Special characters (Chinese, Arabic) - display correctly
- [ ] Network offline - graceful fallback
- [ ] Missing translation keys - fallback to English
- [ ] Rapid language switching - no race conditions
- [ ] Dates and times format correctly in each language
- [ ] Numbers and currency format correctly in each language

---

## PART 6: COMPLETENESS CHECK

- [ ] List ALL hardcoded strings remaining in target file (if any)
- [ ] For each remaining string, document why it wasn't translated
- [ ] Verify no untranslated UI text visible to users

---

## PART 7: FINAL VALIDATION REPORT

Create a summary table:

| Component | File | Lines | UI Strings | Translated | % Complete | Status |
|-----------|------|-------|-----------|------------|-----------|--------|
| PatientDashboard | src/pages/patient/PatientDashboard.tsx | 555 | ??? | ??? | ??% | ✅/❌ |
| MyPractice | src/pages/MyPractice.tsx | 2,251 | ??? | ??? | ??% | ✅/❌ |
| PatientDocuments | src/pages/patient/PatientDocuments.tsx | 1,197 | ??? | ??? | ??% | ✅/❌ |

---

## SUCCESS CRITERIA

Phase is complete ONLY if ALL conditions are met:

✅ 100% of tested UI strings display correctly in every language tested  
✅ No console errors or warnings  
✅ No English text appears when viewing in other languages  
✅ Language switching works instantly without page reload  
✅ All components have proper useTranslation() imports and hooks  
✅ Project builds without errors  
✅ All 25 language files have translation keys  
✅ No untranslated hardcoded strings visible to users  
✅ RTL and special characters display correctly  
✅ Dates/times/numbers format correctly in each language  

---

## FAILURE CRITERIA

Report as INCOMPLETE if ANY condition is met:

❌ Hardcoded English text visible in other languages  
❌ Console errors or warnings  
❌ Missing translation keys from any language file  
❌ Build fails  
❌ Language switching doesn't work  
❌ Missing imports or hooks in components  
❌ UI text overflows or displays incorrectly  
❌ RTL languages break layout  
❌ Special characters don't display  

---

## Browser Automation Testing

### Automated Browser Tests
- Use Chrome/Chromium to access application
- Can test on local dev server (http://localhost:8080) or production (https://www.holarchealth.com/)
- Automated scripts can:
  - Navigate to screens
  - Switch languages
  - Capture screenshots
  - Check console for errors
  - Verify text content via DOM inspection
  - Check for presence of translation keys in HTML

### Browser Test Execution
1. Launch Chrome instance
2. Navigate to target URL (dev or production)
3. Login if required
4. Navigate to each screen
5. Switch languages and verify translations
6. Capture screenshots for documentation
7. Check browser console for errors
8. Report findings

---

## Testing Notes (OPTIMIZED FOR SPEED)

- DO NOT assume translations work based on file inspection alone
- MUST manually verify by opening app and seeing the text
- **Quick Test:** Test 2 languages (Spanish + French) - sufficient to validate all 25
  - Spanish validation confirms entire framework working (same for all languages)
  - French confirms European language rendering
  - Both RTL-independent so layout testing can be deferred
- **Full Test:** If needed, test additional languages (en, es, fr, de, ar, zh)
- Test with real browser dev tools open
- Take screenshots of each screen in different languages
- Document any issues found
- Prefer production site (https://www.holarchealth.com/) for final validation
- Can also test on local dev server (http://localhost:8080/) for development verification

---

## How to Use This Guide

1. Identify target component/screen
2. Go through each PART section systematically
3. Check off each item as verified
4. Use browser automation to access and test
5. Complete PART 7 summary
6. Only report success if ALL items checked
7. If any item fails, document the failure and fix before retesting
8. For automated testing: capture screenshots, check DOM, verify translations
