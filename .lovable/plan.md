## Plan: make language switching apply across the whole interface

1. **Centralize the translation keys**
   - Expand the locale files beyond nav/sidebar text to include common app sections: top bar, footer, settings, patient pages, doctor pages, admin screens, provider/hospital/ER screens, dialogs, buttons, empty states, tab headings, badges, tooltips, and toast messages.
   - Keep English as the source language and add equivalent keys to all supported language files so missing keys do not fall back to English unexpectedly.

2. **Replace hardcoded UI text with `t()` everywhere visible**
   - Convert high-visibility layouts first: `TopBarIcons`, `Footer`, `MobileHeader`, `BottomNav`, `Settings`, provider layouts, ER screens, hospital screens, and patient/doctor/admin dashboards.
   - Convert screen-level headings, tab labels, card titles, action buttons, placeholders, empty states, alerts, modal titles, tooltip text, and status labels.
   - Ensure current examples like **Live SOS Incident Feed**, **Affiliated Hospitals**, **Settings**, **Contact Support**, **Notifications**, provider stats strips, and tab headings change immediately when the selected language changes.

3. **Make profile language persistence reliable for every user type**
   - Ensure the same `LanguageSwitcher` behavior is used across doctor, patient, admin, hospital, ER, insurance/pharmacy/provider layouts.
   - When switching profiles, load that profile’s saved language and call `i18n.changeLanguage()` so the flag and UI update together.
   - Keep local browser language and `profiles.preferred_language` in sync after every selection.

4. **Add translation helpers for repeated dynamic labels**
   - Add small helpers/maps for statuses and roles such as `Active`, `Pending`, `Critical`, `Incoming`, `Assigned`, `Hospital Ops`, `ER Provider`, `Doctor`, `Patient`, etc.
   - Keep user-generated or clinical content unchanged by default: patient names, doctor names, notes, transcripts, AI summaries, addresses, and uploaded/sample records should not be machine-translated unless explicitly requested later.

5. **Prevent layout breakage in longer languages**
   - Use the existing language scale/autofit approach on tab headings, compact nav items, buttons, and status chips where translated strings can be longer.
   - Keep text wrapping/truncation controlled so labels do not overlap on desktop or mobile.

6. **Validate the fix**
   - Test switching to French, Greek, isiZulu, Hausa, and Arabic/RTL from the live UI.
   - Confirm nav, top bar, settings, provider/ER screens, hospital screens, patient screens, dialogs, and tab headings update without refresh.
   - Confirm the selected language persists after refresh and changes correctly when switching profiles.