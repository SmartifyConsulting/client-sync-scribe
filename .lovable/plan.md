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
