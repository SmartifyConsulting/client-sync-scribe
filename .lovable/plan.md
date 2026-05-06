## A. Code edits

### `src/modules/holarchelp/pages/HolarcHelpIncidentDetail.tsx`
- Remove the "Public tracking link — share with anyone" card (lines ~272–280) and unused imports (`Copy`, `Share2` if no longer used) and helpers (`copy`, `shareLink`, `getPublicTrackUrl` import, `trackingUrl`). Keep WhatsApp message builder; if it relies on `trackingUrl`, pass empty string so the link is omitted.

### `src/modules/holarchelp/pages/HolarcHelpHome.tsx`
- Logo: `h-12` → `h-24` (double size); container padding-top kept.
- Hold button: `h-60 w-60` → `h-52 w-52`; SVG ring width/height 300 → 260, `ringR` adjusted; inner text `text-3xl` → `text-2xl`. This rebalances the page so the larger logo fits without scrolling.

## B. Boardroom mockup pack (Nigeria)

### 1. Seed Nigeria demo data (idempotent, tagged `demo_nigeria` in payload)
- Patient: **Adebayo Okonkwo**, Lagos, NHIS member; NOK Ngozi Okonkwo (+234…).
- One demo `holarchelp_incident` in Victoria Island, severity `high`, voice transcript "chest pain and sweating".
- 4 demo offers from approved Lagos providers (Flying Doctors, ERA, Citron, Ambuserv).
- A second seeded incident already assigned to Flying Doctors (status `en_route`, ETA 7 min) for the post-assignment shot.
- One `hospital_admissions` row at Reddington Hospital with HMO Hygeia.

### 2. Capture real screens at iPhone 14 Pro size (390×844)
For each: `navigate_to_sandbox` → `screenshot` → save to `/tmp/raw/`.

**Patient (5 screens — added the no-active-SOS state)**
1. `/patient/holarchelp` — **Idle SOS home** (no active incident). Shows enlarged logo + Hold button + "Press & hold for 2 seconds".
2. `/patient/holarchelp` — **Hold-in-progress** (briefly hold to ~60% ring) showing the active red glow.
3. `/patient/holarchelp/incident/<offer-incident>` — Active incident with AvailableResponders list + 3-min countdown.
4. `/patient/holarchelp/incident/<assigned-incident>` — Flying Doctors responding card, ETA 7 min, live tracking map.
5. `/patient/holarchelp/nearby` — Lagos providers map + list.

**Provider (4 screens)**
6. `/provider/holarchelp` — Provider dashboard.
7. `/provider/holarchelp/incident/<offer-incident>` — Incoming offer (accept/decline).
8. Same after accept — Status updates strip (en route → arrived → collected → at hospital).
9. Hospital admission form pre-filled for Adebayo at Reddington.

### 3. Frame each screenshot
Composite into an iPhone-style bezel via a Pillow script on a deep-navy → red brand gradient. Output `1080×2160` PNGs to `/mnt/documents/nigeria/`.

### 4. Boardroom PDF (ReportLab)
Cover page → 9 content pages (one per screen, phone left, caption + KPI right) → closing page with provider roster (10 Lagos/Abuja providers from DB) and next steps.

### 5. QA
Render PDF → `pdftoppm` → inspect every page for clipping/overlap/missing fonts → fix → re-render. Verify logo enlargement and button shrink on the live preview screenshot before continuing.

### Deliverables (saved to `/mnt/documents/nigeria/`)
- `holarchelp-nigeria-board-deck.pdf`
- `01-patient-sos-idle.png` … `09-provider-admission.png`

## Out of scope
- No backend/RLS changes; data is seeded read-only and tagged.
- Tracking link route (`PublicTrack.tsx`) is left intact — only the in-app card is removed.
