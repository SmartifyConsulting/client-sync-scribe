

# Plan: Move Certificates into Profile & Compact Layout

## Overview
Embed the CPD Certificates management directly into the doctor's Profile page, make CPD data visible to patients searching for doctors, and compact the entire Profile layout for both roles.

## Changes

### 1. Compact Profile Layout with Tabs (`src/pages/Profile.tsx`)
Replace the current long-scroll layout with a **tabbed interface** using the existing Tabs component:

**Doctor tabs:**
- **Personal** — Avatar, name, email, mobile, mailbox (condensed grid)
- **Practice** — Practice number, registration, specialty, address, logo, signature, country, language, narration voice
- **Partners** — Practice partners list and add form
- **Pricing** — Service prices and currency
- **Certificates** — Full CPD certificates management (moved from standalone page)

**Patient tabs:**
- **Personal** — Avatar, name, email, mobile
- **Preferences** — Auto-email toggles

Layout changes:
- Reduce `space-y-8` → `space-y-4` between sections within tabs
- Reduce card padding from `p-6` → `p-4`
- Use `sm:grid-cols-3` where possible to tighten form grids
- Remove the standalone CPD Points badge card at the top; instead show points in the Certificates tab header

### 2. Embed CPD Certificates in Profile (`src/pages/Profile.tsx`)
Move the core CRUD logic from `CPDCertificates.tsx` into a new section within the "Certificates" tab:
- Compact table with add/edit/delete inline
- File upload for certificate attachments
- Total CPD points shown in tab label: `Certificates (42 pts)`

### 3. Show CPD Points in Doctor Search Results (`src/components/patient/InviteDoctorDialog.tsx`)
When patients search for doctors, display CPD points alongside specialty:
```
Dr. Smith
Cardiologist · PR: PR123456 · 42 CPD Points
```
This requires a query to sum `cpd_certificates.cpd_points` for each doctor result.

### 4. Database: RLS Policy for Patient Access to CPD Data
Add a SELECT policy on `cpd_certificates` so authenticated users can read any doctor's certificates (public professional data):
```sql
CREATE POLICY "Anyone authenticated can view CPD certificates"
ON public.cpd_certificates FOR SELECT TO authenticated
USING (true);
```

### 5. Cleanup
- Keep `/cpd-certificates` route but redirect to `/profile` (or remove entirely)
- Remove the CPD badge from the Profile header since it moves into the Certificates tab

## Files to Modify/Create

| File | Change |
|------|--------|
| `src/pages/Profile.tsx` | Add Tabs layout, embed CPD certificates, compact spacing |
| `src/components/patient/InviteDoctorDialog.tsx` | Show CPD points in doctor search results |
| `src/App.tsx` | Redirect `/cpd-certificates` to `/profile` |
| Database migration | Add RLS SELECT policy on `cpd_certificates` for authenticated users |

