# Wealth Live Workspace

## Goal
Each client gets an action-first workspace that answers one question: "What needs to happen now for this client to move forward?" It only reads from the workflow engine and the existing records: tasks, documents, recommendations, applications, compliance checks and appointments. It keeps no workflow state of its own.

## Where it appears
- **Practitioner:** a new **Live** tab on the client profile, placed first ahead of Workflow.
  - A "View workflow" link on any item switches to the Workflow tab with that group's details already open.
  - The Workflow Map gets a "Back to Live" link.
  - Both tabs keep the same client and stay in sync through the address bar (`?tab=live` or `?tab=workflow&group=presentation`).
- **Client:** the "Your wealth journey" card on the client's own profile expands. It gains three parts: Your actions, We're waiting for, and Recently completed.

## Wealth manager view
**Client context strip (always visible)**
- Client, consultation (latest session date), current stage, status (e.g. "Awaiting client"), next action and outstanding count.
- Quick links to the current recommendation or ROA, the application, and the relevant documents.

**Five compact sections**

| Section | Contents |
|---|---|
| NOW | Overdue or due-today open actions; the recommendation awaiting decision; missing documents or ROA signature at the current stage; an application ready to submit; outstanding underwriting |
| NEXT | The engine's next move, with what it needs (e.g. "Application: ready once ROA is signed"), plus open actions owned by the wealth manager and due later |
| WAITING | Items grouped by who must act (client, insurer or provider, firm, wealth manager), built from open actions' owner role and the current stage |
| BLOCKED | The blocked stage and its exact missing items, taken from the engine's blocker list |
| COMPLETED | Recent milestones from the workflow history (e.g. "Recommendation presented", "Client accepted") and recently completed actions |

**Each item card shows:**
- WHAT, WHO (owner badge), WHEN (due date with a priority chip: overdue, due today, due soon, blocked, waiting or normal), WHY and WHAT HAPPENS NEXT.
- The WHY and NEXT text comes from a small rules table keyed by stage and requirement. For example, ROA signature: "Required before application can proceed" / "Application becomes ready for submission".
- Actions reuse existing flows only: View ROA or document (the existing preview), Send reminder (a notification to the client), Open client record, View workflow, Mark action done (existing task completion), and the engine's decision or present buttons where they apply.

**Annual review**
When the next review date is within 60 days, an "Annual review due" item appears in NOW or NEXT. Its "Start annual review" button calls the existing engine function.

## Client view (simplified)
- Your wealth journey: the existing simplified steps.
- **Your actions:** open actions owned by the client, with a due date and a plain reason.
- **We're waiting for:** one plain sentence, for example "Your Wealth Manager is preparing your application."
- **Recently completed:** plain-language milestones only. Compliance and internal steps are hidden.

## Live updates
- The workspace listens for live changes to the workflow, workflow history, tasks, recommendations, applications and compliance tables for this client, and refreshes immediately. Signing a ROA or accepting a recommendation therefore moves items from BLOCKED to NEXT without a manual refresh.
- This is a live feed into the screen, not stored state. The engine stays the source of truth.

## Notifications (existing notifications list)
A database trigger on the workflow history writes to the existing notifications list for key events:
- Recommendation presented: the client is told "Your Wealth Manager has prepared a recommendation for you."
- Accepted or declined: the wealth manager is told "<Client> has accepted the recommendation."
- ROA signed document added: the wealth manager is told "<Client> has signed the ROA."
- Application ready or submitted, or policy issued: the wealth manager is notified.
- Annual review action created: the wealth manager is notified.

Send reminder also writes a client notification.

## Technical details
- New files in `src/features/wealth-workflow/workspace/`:
  - `rules.ts`: WHY/NEXT text per requirement and stage, milestone labels, priority bucketing.
  - `useLiveWorkspace.ts`: builds the NOW/NEXT/WAITING/BLOCKED/COMPLETED lists from `useWorkflowMap`, `useWorkflowAudit`, `useWorkflowBlockers` and latest-session data.
  - `useWorkflowRealtime.ts`: a live subscription that refreshes the wealth-* query keys.
  - `LiveWorkspace.tsx`, `WorkspaceItem.tsx`, `ClientWorkspace.tsx`.
- `WorkflowMap` gains an `initialGroup` prop that opens that group's details, and an `onBackToLive` prop.
- `PatientProfile.tsx`: add the Live tab and pass the `group` value from the address bar to the map.
- `Profile.tsx`: swap `ClientJourney` for `ClientWorkspace`.
- Migration:
  - Add the wealth tables and the tasks table to the live-updates publication.
  - Add a `wealth_notify_transition()` trigger (runs with elevated database rights) on the workflow history table that inserts into `notifications`, using the fields user, type, title, description and reference.
  - Add a `wealth_send_reminder(todo_id)` function that checks access and notifies the client's linked user account.
- The Mark done action uses the existing task update. It never writes a workflow stage.
