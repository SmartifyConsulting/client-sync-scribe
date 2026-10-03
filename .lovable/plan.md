# Claims screen and a site-wide style clean-up

## 1. Claims screen
- The **Claims** menu item opens its own **Claims** page. At the moment it jumps to a tab inside My Future.
- **Clients** see all of their own claims. **Wealth Managers** see claims for all of their clients, with a filter by client.
- **Table columns:** Claim type, Policy (linked application), Description, Status, Logged date, Last updated, Attachment.
- **Create:** a "Log a claim" button opens a form with type, policy, description, an optional attachment, and the client (Wealth Managers only).
- **Read:** clicking a row opens a side panel with the full details, the attachment preview and the dates.
- **Update:** edit the description, type and attachment. Only Wealth Managers can change the status (Submitted, In review, Awaiting documents, Approved, Declined, Paid).
- There is no delete, as you asked for create, read and update only.
- You can search the list and filter by status.
- The Claims tab in My Future becomes a short summary with a "View all claims" link.

## 2. Style audit and clean-up
The signed-in home dashboard is the reference. From it I will build one style sheet that covers:
- page title and subtitle size and weight
- frame (card) border, corner rounding, padding and header style
- section labels, body text size, muted text
- tab bar style (the My Profile tab format)
- buttons, badges, tables, empty states, form fields
- page width and spacing between sections

I will then go through every screen a client or Wealth Manager can reach and bring each one in line:
- Dashboard, My Profile (all tabs), Live Workspace, My Future (all tabs), Claims, Documents
- Calendar and booking, Consultations, My Clients and the Client Record, My Business, To-Do
- Notifications, Settings, Billing, Admin pages, and the sign-in, sign-up and reset password screens

**Audit report:** before changing anything, I will write a written audit listing, for each screen, what does not match (for example "uses bigger headings", "different card corners", "white tab text instead of brand tab"). After the changes I will re-check every screen at desktop and phone sizes and give you a final list of anything still inconsistent, and why. Screens hidden from wealth users (old health modules) will be listed as "not changed".

## Technical details
- Claims page: new `src/pages/Claims.tsx` at the `/claims` route, added to the client and Wealth Manager guards and the AppLayout allow-list. The Sidebar and BottomNav links point to `/claims`.
- Data comes from the existing `wealth_claims` table (columns: type, description, status, attachment_path, application_id, patient_id). Before building, I will check its RLS policies and add update policies plus a status check (client: own rows, cannot change status; firm members: their clients) in a migration if they are missing. Attachments use the existing private upload bucket with signed URLs.
- Styles: add shared classes to `src/index.css` under `@layer components` (`.page-title`, `.page-subtitle`, `.frame`, `.frame-header`, `.section-label`, `.tabs-brand`), and add matching shared `PageHeader`, `Frame` and `BrandTabs` components. The roughly 337 one-off `text-[Npx]` sizes and the hardcoded `bg-white text-black` tab classes are replaced with these tokens. Semantic tokens only.
- Audit output: a checklist in `roadmap.md`, and Playwright screenshots of each screen at 1280px and 390px, signed in as Georgia (client) and as a Wealth Manager.

---

# 3. Marlin Moodley's firm profile (My Business)

## What changes
- The demo Wealth Manager **Jaco Steyn is renamed Marlin Moodley**, and his profile is filled in from the Introduction Letter. Every field on the sheet is kept; none are dropped.
- **About Me** is removed from every profile view.
- **Firm Information:** Hospital Affiliations, Firm Management Assistants and Partners are removed from the screen. They are hidden, not deleted.
- **Digital Signature** and **Voice Narration** settings are hidden for now.

## Where each field goes
| Section on My Business | Fields from the sheet |
|---|---|
| **Planner Details** | Title and name, ID number (stored masked as on the sheet: 830131****081), postal address, telephone/cell, email addresses (both), planner status ("Representative of the FSP by Mandate"), highest qualification, years of experience |
| **Credentials** tab | Authorised FSCA product categories (all 12: 1.1 to 1.23, as a ticked list), PI cover (Yes/No) |
| **Firm Information** | FSP name and legal status statement, FSB licence number (43435), company registration number (2010/019601/07), firm telephone (0861 737 858), physical address and website (from the letter footer), directors |
| **Compliance** (new section in Firm Information) | Compliance officer (Masthead (Pty) Ltd), telephone, fax, email, complaints address, Conflict of Interest policy and register statement |
| **Product Suppliers** (new section in Firm Information) | Three editable lists: Short Term (9 suppliers), Life (8), Investments (8). There is also a Health list, left empty as on the sheet. |
| **Remuneration Disclosure** (new section in Firm Information) | How representatives are paid (commission from product suppliers), the 10% shareholding statement, and up to 3 suppliers that paid more than 30% of income, with percentages (Old Mutual, 32%) |

You can move any of these sections later.

The Letter of Authority I just built will read these saved details instead of fixed wording, so it always matches the firm profile.

## Technical details
- New table `wealth_practice_info` (one row per Wealth Manager): planner, firm, compliance and remuneration columns as text, `fsca_categories text[]`, `pi_cover boolean`, `product_suppliers jsonb` ({short_term, life, investments, health}), and `top_suppliers jsonb`. The migration adds GRANTs and RLS: the owner can read and write their own row, firm members and admins can read it, and clients linked to that Wealth Manager can read it (for the LOA and disclosure).
- The rename and the seed data are applied as data updates to profile `d1eeab28-…` (Jaco Steyn).
- `MyPractice.tsx`: remove the `AboutMeAccordion`, `HospitalAffiliations`, `PracticeAssistants`, Partners, Signature and Narration sections from the render. The code stays in place. Also hide About Me in `DoctorProfileDialog` and `MyDoctors`.
- `onboardingTemplates.loaHtml` takes the practice info record, with the current text kept as the fallback.
