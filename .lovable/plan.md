## Plan: Make calendar month and day names update dynamically

1. **Create a shared localized date helper**
   - Add reusable functions that read `i18n.language` and format dates using the app’s calendar translation keys.
   - Cover full month names, short month names, full day names, short day names, and combined labels like `June 2026`, `Monday, June 29`, and week ranges.

2. **Fix the main Doctor Calendar screen**
   - Replace hardcoded `en-US` calls and `date-fns format(..., "MMMM/MMM/EEE")` labels with translated labels.
   - Replace the static `daysOfWeek = ["Sun", "Mon", ...]` header with translated day names.
   - Ensure month title, week title, today’s schedule date, event detail date, and delete confirmation date all update immediately when the language changes.

3. **Fix the Patient Calendar screen**
   - Replace all `date-fns` month/day formatting in week, month, year, upcoming cards, and selected-day headings with translated labels.
   - Replace hardcoded weekday headers like `Mon Tue Wed` with translated day names.

4. **Fix shared date picker calendar**
   - Update the `Calendar` component so its `react-day-picker` locale is recreated when the active language changes.
   - Normalize `calendar.daysNarrow` because some locale files store it as an object while others store it as an array, which can prevent correct dynamic rendering.

5. **Fix Emergency/Fleet maintenance calendar labels**
   - Replace its hardcoded `toLocaleDateString("en-US")` and `Sun/Mon/...` headers with translated calendar labels so it follows the same behavior.

6. **Verify after implementation**
   - Switch language in the preview and confirm the visible calendar month names and day names update without requiring refresh.
   - Check at least the main `/calendar` view and the patient calendar view.