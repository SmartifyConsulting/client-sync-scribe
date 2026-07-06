## Move "Templates" tab into My Practice

**1. `src/pages/MyPractice.tsx`**
- Add a new `<TabsTrigger value="templates">` between the existing `practice` and `referrals` triggers, labeled `t("documents.tabTemplates")` (reuse existing key), styled to match sibling triggers.
- Add a matching `<TabsContent value="templates" className="mt-4">` that renders `<Documents hideHeader />` (import from `@/pages/Documents`), placed just before the `referrals` TabsContent.

**2. `src/pages/doctor/DoctorDocumentsPage.tsx`**
- Remove the Templates `TabsTrigger` and its `TabsContent`.
- Since only Documents remains, simplify: drop the `Tabs` wrapper and render `<DoctorDocumentsTab />` directly under the page heading (keep the h1 title).
- Remove now-unused `Tabs*` and `Documents` imports.

No routing, data, or i18n key changes required (reusing `documents.tabTemplates`).