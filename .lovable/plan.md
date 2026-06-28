## Doctor home page — convert to selected language

Wire every visible label on the doctor Dashboard (`/doctor-dashboard`) to `t()` and translate into all 25 supported locales.

### Files to change

1. **`src/i18n/locales/*.json` (all 25)** — add a new `doctorDashboard` namespace with native translations for: greetings (morning/afternoon/evening), subtitle, stat-card titles (Total Patients, This Week, Doctor Rating, Vula Vouchers, No ratings yet), My Round Tables panel (heading, search placeholder, "No patients found"), To-Do List (heading, add placeholder, Active, Done, empty states), Recent Activity (heading, default item strings).

2. **`src/pages/Dashboard.tsx`** — import `useTranslation`; replace the hardcoded greeting trio, page subtitle, four `StatsCard` titles, the duplicated "My Round Tables" panel (desktop + mobile) heading, search placeholder, and "No patients found" with `t("doctorDashboard.*")`. Strip the English suffixes from change badges ("this month", "from last week", "Comm:/Exp:/Prof:") so they stay numeric-only and locale-clean.

3. **`src/components/dashboard/CompactTodoList.tsx`** — translate the "To-Do List" header, "Add a task..." input placeholder, the `Active (n)` / `Done (n)` tab labels, and the empty-state lines ("No active tasks" / "No completed tasks").

4. **`src/components/dashboard/RecentActivity.tsx`** — translate the "Recent Activity" header and the default activity strings ("Getting started", "Add your first patient to get started", "Just now"). The dynamically-generated mock activity strings ("Session completed", "Document generated", "Task completed", "Follow-up sent") are mapped through `t()` lookups too.

5. **`TodaysBriefing`** is left as-is — it already runs its content through the `translate-text` edge function based on `profiles.preferred_language`, so it auto-translates separately.

### Out of scope this pass

- Dialogs opened from the dashboard, the Patient Access Requests card content, the sidebar/topbar (already partially keyed in earlier passes).
- Dynamic data (patient names, AI summaries, document titles).
- Other portals — those will be subsequent sweeps, one screen at a time.

### Verification

After the changes, switch the top-right language picker between English → isiZulu → Igbo → 中文 → العربية and confirm: the greeting, subtitle, every stat-card title, both Round Tables panels, the To-Do List header/tabs/placeholder, and the Recent Activity header all flip language. RTL flips correctly for Arabic.