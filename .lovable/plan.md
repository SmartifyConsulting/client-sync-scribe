# Life Events box, a more polished Live Workspace, and Georgia's new policy

## 1. Replace the "You don't have to figure it out alone" box (client dashboard)
It becomes a **Life Events** box:
- **Title:** "Life events". **Subtitle:** "Tell us what's changed and see how it might affect your cover."
- **Capture an event:** pick the event type (marriage, new baby, new job, retirement, property purchase, divorce, death in the family, other), a date and a short note. It saves to the client's existing life events, so it also feeds the AI Summary.
- **Ask Holarc AI:** a question box, for example "How does having a baby affect my policies?". It answers using Georgia's current cover, investments, beneficiaries and recent life events.
- **Advice notice:** every answer ends with, and the box always shows: "This is general guidance, not financial advice. Please speak to your Wealth Manager before making changes."
- **Hand-off:** a "Share with my Wealth Manager" button turns the question into an action for the Wealth Manager.
- **Available to all clients:** no longer admin-only.

## 2. A more elegant Live Workspace
- **Equal split:** the step list and the Working Window share the width 50/50.
- **Calmer type:** smaller, lighter step titles (14px, medium weight instead of large bold); 11px tracked labels; the "You are here" and "Completed" badges become small outline pills; lighter borders and more white space. The summary strip at the top becomes one slim line.
- **Working Window:** a quiet header, a 15px step title, body text at 13px, and sections separated by fine rules instead of icons. A subtle pulse only.
- **Rename:** "Client Gateway" becomes **Client Onboarding** everywhere.

## 3. Start Georgia on a new policy
- Georgia's current workflow (her issued policy) is closed as completed, and its history is kept.
- A new workflow opens for her at Step 1 · Client Onboarding, labelled "New policy". Both of you will see it pulse at the first step, and we can then walk through it step by step.

## Technical details
- New edge function `life-event-advice`: validates access with `can_view_patient_record` and reads the client's profile, policies, applications and life events. It streams from the Lovable AI gateway (`openai/gpt-6-astra`, Responses API, `store:false`), with a system prompt of general guidance only, no personal advice, and a closing broker disclaimer. A small `LifeEventsPanel.tsx` replaces the block in `MyPersonalDashboard.tsx`, reusing the `client_life_events` insert from `ClientAISummary`.
- "Share with my Wealth Manager" inserts a `todos` row (owner wealth_manager, linked to the workflow).
- Styling: edit `WorkflowGroupCard.tsx`, `WorkingWindow.tsx` and `WorkflowMap.tsx` (grid `lg:grid-cols-2`), using semantic tokens only.
- Rename: `groups.ts` title "Client Onboarding" (the key stays `gateway`).
- Georgia data change (a data operation, not a schema change): set her active `wealth_workflows` row to status `completed`, then call `wealth_start_workflow(b26f3582-…)`. The existing single-active-workflow rule allows this once the old one is closed. If needed, a `case_label` note of "New policy" goes into the workflow's notes.
- Verify with Playwright as Georgia: the dashboard box, an AI answer with its disclaimer, and Live Workspace showing Step 1 pulsing.
