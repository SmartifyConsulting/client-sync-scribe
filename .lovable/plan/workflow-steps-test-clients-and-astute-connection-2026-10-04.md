# Workflow steps, test clients and Astute connection

## 1. Step names and order (no colour, font or styling changes)
- Everyone sees the same step names as the screenshot, clients and Wealth Managers alike. The friendlier client names ("Getting started", "Your current cover"…) go.
- New order:
  1. Client Onboarding: keeps the current consolidated sub-steps.
  2. Needs Analysis: Capture facts and risk profile · Life, short-term and investment gaps · Estate duty estimate · Or: single-need disclaimer
  3. Portfolio: Astute pull: life, disability, investments · Insurer schedules and claims history · Cross-alert check · Push profile to CRM
  4. Quotes & ROA, 5. Presentation, 6. Issuance & Review: same as the screenshot.
- Guidance text and footers move with their steps.

## 2. Stepper display: the screenshot layout with Izenzo flow mechanics
- **Same screen for everyone:** clients and Wealth Managers see the identical map on the left and the identical Live Workspace step list on the right, updated in real time. Only the wording ("you" or the client's name) changes with who is reading.
- **Left side:** the map from the screenshot. Step cards with role badges, linked by thin grey arrows, plus the Documents tile with its count. The current step card shows "You are here" and its current sub-step reads "Next".
- **Right side:** the step list. Finished steps show a tick and their completed sub-steps. The current step is open with the dark heading, its one current sub-step pulses, "then N more" sits under it and a Next box sits below. Later steps stay locked.
- **Izenzo flow mechanics:**
  - Only one thing pulses: the next action for the person viewing.
  - When it's the other party's turn, the step shows "Waiting on ..." and nothing pulses on your screen.
  - When a sub-step completes, it ticks over, the pulse moves to the next sub-step, and a short soft chime plays. A mute toggle sits in the workspace header and remembers your choice.
  - When a whole step completes, it collapses with a tick and the next step unlocks and opens.
- Only the current step opens. Clicking a locked or later sub-step does nothing.
- The existing colours and fonts stay as they are.

## 3. Real client records for Claims
- Link Georgia Adams properly to Marlin Moodley as his client, and add her policies so they appear in the Policy list.
- Create 3 more sample clients under Marlin, with one policy each, and give each a workflow at Step 1.
- How to add clients from now on: sign in as the Wealth Manager, open **My Clients** (or the dashboard), click **New Client**, then send the link by WhatsApp or email. After sign-up the client appears on Claims.

## 4. Astute connection
- A secure server function signs in at `https://aol.astutefse.com/Online/account/login` with Marlin's saved username, password and PIN.
- It fetches the client's life, disability and investment holdings and saves them against the client.
- When it succeeds, it ticks "Astute pull" in Portfolio (now Step 3).
- In the Working Window, the Wealth Manager gets a "Pull from Astute" button with the last-synced time.
- Risk: this signs in the way a person would, not through an official Astute API. It may break if Astute adds extra security checks or changes the page, or if Marlin's password changes. If that happens it will show a clear error. I'll test the sign-in first and report back before building the data pull.

## Technical details
- `map/groups.ts`: swap the Portfolio and Needs Analysis groups, renumber them, and render `title` for every viewer. Update the `past()` thresholds to match.
- Stage order: a migration updates the wealth stage-order function so `needs_analysis` comes before `information_required`. The existing workflow functions keep making every stage change (no direct UI writes). Re-derive stages for open workflows afterwards.
- `stepGuidance.ts`: re-key the guidance to the new order.
- `WorkflowMap.tsx` / `WorkflowGroupCard.tsx` / `WorkflowStepper.tsx`: bring back the split view (map with connectors and Documents tile, plus the step tray) using the existing classes.
- Data: add rows to patients, wealth_workflows and wealth_applications using the data-update tool.
- New `astute-sync` edge function: a cookie-session login (including the anti-forgery token and the PIN step), plus a new `wealth_portfolio_holdings` table with RLS and GRANTs (owner WM and linked client can read).
