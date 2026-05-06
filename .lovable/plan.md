## Scope

Refine the SOS experience across three areas. UI-only changes plus one tiny data write (use the existing `holarchelp_incidents.notes` column for the closure write-up — no migration).

## 1. SOS landing screen (`HolarcHelpHome.tsx`) — premium emergency-first redesign

**Header**
- Replace the current "TAP TO SEND / SOS" text header with the **Holarc Help logo** (`src/assets/holarc-help-logo.png`), centered, ~40px tall, generous top padding.
- Remove the "Active emergency in progress" banner from this screen (the dedicated incident screen already surfaces it; keep a thin "Resume active incident →" text link only when one exists).
- Remove warning/instructional cards from the top (Emergency Contact warning + Location-permission card move into a single inline pill below the CTA, only when relevant).

**Primary focus area (centered)**
- Title: **"Emergency Assistance"** — `text-2xl font-extrabold tracking-tight`
- Subtext: **"Help will be alerted instantly"** — `text-sm text-muted-foreground`
- Perfect 8pt vertical rhythm above and below CTA.

**Primary CTA — HOLD FOR HELP**
- Large circular button (~260px), centered, strong medical red `#E02020` gradient, soft pulsing glow + drop shadow.
- Label inside: **"HOLD FOR HELP"** (two lines: "HOLD" big, "FOR HELP" smaller below; tracking).
- **Press-and-hold interaction (2.5 s)** — radial SVG progress ring fills around the button while pressing; releasing early cancels and resets. Triggers `navigator.vibrate([30, 40, 30, 40, 80])` at start, completion, and cancel (when supported).
- Prevents accidental taps: pure click does nothing, only completed hold fires `triggerSOS()`.
- Keep doctor branch (open `DoctorSosChooser` instead) on completed hold.

**Secondary actions (de-emphasized)**
- Plain text link below CTA: **"+ Add someone we can notify"** → `/patient/details?section=health` (only shown when no contacts; otherwise hidden).
- Smaller muted text link: **"Set preferred responders"** → `/patient/holarchelp/contacts`.
- Both are `text-xs text-muted-foreground underline-offset-4 hover:underline` — must not visually compete with the CTA.

**Removed from this screen**
- "Find nearby provider" card
- "Incident history" card
- Big amber warning blocks (collapsed into compact inline pill only when blocking — e.g. "Location off — tap to retry")

**Post-activation confirmation state** (replaces current "Help is on the way" block)
- Large text: **"Help is on the way"**
- Sub: **"Notifying your emergency contacts and nearby responders"**
- Three live status rows with check/spinner icons:
  - ✓ Location shared
  - ⏳ Contacts notified (becomes ✓ when share-incident-with-contacts resolves)
  - ⏳ Searching for nearby providers (becomes ✓ when assigned_provider_id appears)
- Secondary outline button: **"Cancel alert (10s)"** — disabled count-up; if pressed within 10 s, sets `status='cancelled'` and returns to landing. After 10 s the button hides.
- Below: small link "View live tracking →".

```text
┌──────────────────────────┐
│      [Holarc Help]       │
│                          │
│   Emergency Assistance   │
│ Help will be alerted     │
│       instantly          │
│                          │
│        ╭────╮            │
│       ╱      ╲           │
│      │  HOLD  │  ← hold  │
│      │ FOR HELP│  2.5 s  │
│       ╲      ╱           │
│        ╰────╯            │
│                          │
│ + Add someone we notify  │
│   Set preferred responders│
└──────────────────────────┘
```

## 2. Incident closure write-up (`HolarcHelpIncidentDetail.tsx`)

Replace the bare "Close incident" button flow:
- Clicking **Close incident** opens a `Dialog` titled **"Close incident"** with:
  - Read-only summary: status, responder name, started/duration.
  - Required textarea: **"Last activity / interaction with the patient"** placeholder ("e.g. Patient handed over to ER team at 14:52, conscious and stable.").
  - Voice-dictation mic button reusing the existing dictation hook pattern (optional — graceful fallback to typing).
  - Confirm button "Close incident" (disabled until ≥10 chars).
- On confirm: update `holarchelp_incidents` with `status='completed'`, `resolved_at`, `completed_at`, and `notes` set to the write-up. Show toast and navigate home.
- On the closed-incident view, render the closure write-up in a labelled card "Closure summary" above the timeline.

## 3. Incident-detail header — icon-only quick actions + back nav restored on history

In `HolarcHelpIncidentDetail.tsx`:
- Sticky top bar: keep back arrow, then make Call / Share / History **icon-only** buttons (`size="icon" variant="outline"` ~`h-9 w-9 rounded-full`). Remove the "Share" and "History" labels. Add `aria-label` + `title` for accessibility.

In `HolarcHelpIncidents.tsx`:
- Add a back-nav header row: `← Back` button (navigates to `/patient/holarchelp`) on the left, page title centered, matching the rest of the SOS screens. Empty state and list cards keep current styling (no other UI changes here).

## Hero-page button clickability fix

The user reported "make the whole buttons on the SOS hero page clickable". In the current code the home tiles are `<button>` elements but the small chevron + icon padding can leave dead zones. After the redesign above, the only interactive elements on the hero are the CTA and two text links — so this resolves naturally. (No leftover non-clickable card areas in the new layout.)

## Files

- `src/modules/holarchelp/pages/HolarcHelpHome.tsx` — full redesign (header, CTA hold-to-trigger, confirmation state, secondary links)
- `src/modules/holarchelp/pages/HolarcHelpIncidentDetail.tsx` — icon-only top bar; close-incident dialog with write-up; render closure summary on closed view
- `src/modules/holarchelp/pages/HolarcHelpIncidents.tsx` — add back nav header
- `src/assets/holarc-help-logo.png` — already copied into project

## Out of scope

- No DB migration (uses existing `notes` column).
- No changes to provider-side screens, dispatch logic, photo upload, voice-note recorder, or routing.
- No changes to Nearby / Contacts pages (request didn't mention them this round).
