

# Plan: Restructure My Practice Tabs & Sidebar Navigation

## Summary
Consolidate navigation by moving My Patients, Invoices, and Templates into My Practice as tabs, reorder existing tabs, compact the Personal Information layout, and reorder sidebar nav items.

## Changes

### 1. Sidebar Nav (`src/components/layout/Sidebar.tsx`)

Update `doctorNavItems` to remove My Patients, Invoices, Templates and reorder My Rewards:

```
Dashboard → My Holarchive → My Practice → Calendar → Sessions → To-Do List → My Rewards
```

Remove: `My Patients (/patients)`, `Invoices (/invoices)`, `Templates (/documents)`.
Move `My Rewards` after `To-Do List`.

### 2. My Practice Tabs (`src/pages/MyPractice.tsx`)

Rename "Practice" tab to "My Practice". Add new tabs and reorder:

```
My Patients | My Practice | Referrals | Certificates | Pricing | Invoices | Templates
```

- **My Patients tab**: Import and render the `Patients` component (from `src/pages/Patients.tsx`) embedded inside the tab. The component already has the alphabetical listing, search, filters, and add patient dialog.
- **Invoices tab**: Import and render the `DoctorInvoices` component (from `src/pages/doctor/Invoices.tsx`) embedded inside the tab, after Pricing.
- **Templates tab**: Import and render the `Documents` component (from `src/pages/Documents.tsx`) embedded inside the tab.
- **Certificates**: Move after Referrals (before Pricing).
- Default tab changes to `"patients"`.

Each embedded component will need a `hideHeader` prop (or similar pattern) to suppress their standalone page headers when rendered inside tabs.

### 3. Compact Personal Information (`src/pages/MyPractice.tsx`)

In the Personal Information frame, put Email and Mobile Number on the same row using a 2-column grid:

```
Row 1: [First Name] [Last Name]
Row 2: [Email]       [Country Code + Mobile Number]
Row 3: [Specialty]
Row 4: [Document Mailbox]
```

Currently Email takes `sm:col-span-2` and Mobile is a separate full-width block below. Change to both fitting in the same `sm:grid-cols-2` row.

### 4. Embedded Component Changes

| File | Change |
|------|--------|
| `src/pages/Patients.tsx` | Add `hideHeader` prop to suppress the page header and outer spacing when embedded |
| `src/pages/doctor/Invoices.tsx` | Add `hideHeader` prop to suppress the page header when embedded |
| `src/pages/Documents.tsx` | Add `hideHeader` prop to suppress the page header when embedded |

### 5. Routes
Keep existing routes (`/patients`, `/invoices`, `/documents`) functional for direct URL access and bookmarks — they continue to render the standalone pages. The sidebar just no longer links to them.

## Files Modified

| File | Change |
|------|--------|
| `src/components/layout/Sidebar.tsx` | Remove 3 nav items, reorder My Rewards |
| `src/pages/MyPractice.tsx` | Add 3 new tabs, reorder tabs, rename Practice→My Practice, compact Personal Info layout, import embedded components |
| `src/pages/Patients.tsx` | Add `hideHeader` prop |
| `src/pages/doctor/Invoices.tsx` | Add `hideHeader` prop |
| `src/pages/Documents.tsx` | Add `hideHeader` prop |

