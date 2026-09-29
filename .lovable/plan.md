# Live Workspace: step list on the left, working window on the right

## What you will see
- **Client record (Wealth Manager):** the "Live" tab is removed. The "Workflow" tab stays, keeps its content, and is renamed **Live Workspace**.
- **Client menu:** a new "Live Workspace" item between My Profile and My Future. It shows the same screen for the client's own record.
- **Real time:** both the Wealth Manager and the client see it update live when a step is completed, a document is uploaded or a form is signed.

## Layout
```text
+------------------------------------+-------------------------------+
| (v) Client Gateway   Completed   v | WORKING WINDOW                |
| (v) Portfolio        Completed   v | Step 6 · Issuance & Review    |
| (v) Needs Analysis   Completed   v | Now: Policy schedule to       |
| (v) Quotes & ROA     Completed   v |      portal and CRM           |
| (v) Presentation     Completed   v | What is required:             |
| (6) Issuance & Review [You are here] |  - who does it (System)     |
|   v INSURER  Accept, decline       |  - what's needed / missing    |
|   • SYSTEM   Policy schedule  Next |  - documents involved         |
|   v SYSTEM   Schedule review       |  - what unlocks next          |
|     CLIENT   Acknowledge renewal   | [action button if it's yours] |
|   Repeats every 12 months          |                               |
+------------------------------------+-------------------------------+
```
- **Left:** the existing step accordions, exactly as in your screenshot: a tick circle, icon, "Completed" badge, "You are here" on the current group, and substep rows with role tags (Insurer, System, Client, Advisor). The current substep pulses softly.
- **Right:** a working window that follows the pulse. When the current step changes, it slides over to explain the new one:
  - what the step is, in plain language
  - who needs to act
  - what is still outstanding or blocking, and why
  - the related documents
  - what completing it unlocks
  - an action button, but only when it is the viewer's own turn (for example "Sign ROA" for the client)
- **Clicking another step:** clicking any substep on the left shows its explanation in the window. A "Back to current" link returns to the live step.
- **Client view:** only the client's own actions are clickable, with Wealth Manager and system steps shown for information.
- **Mobile:** the window drops below the step list.

## Technical details
- `PatientProfile.tsx`: remove the `live` trigger and content, rename the `workflow` trigger to "Live Workspace", and point old `?tab=live` links to `workflow`.
- `WorkflowMap.tsx`: wrap it in a 2-column grid (`lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]`). The existing group cards stay on the left, and `WorkflowGroupCard` gets an `onSelectSubstep` callback and a soft pulse class on the current substep.
- New `src/features/wealth-workflow/map/WorkingWindow.tsx`: reads the current/selected substep from `useWorkflowMap`, outstanding and blocked items from `useLiveWorkspace`, and documents. The explanation text comes from a new `stepGuidance.ts` map (one entry per substep, in wealth wording). Updates arrive through the existing `useWorkflowRealtime`, with a fade-in animation when the step changes.
- Pulse: a `throb` keyframe in tailwind.config using `--primary`. Semantic tokens only; rounded shapes; current app colours.
- Client: a new `/my-workspace` route (added to the AppLayout shared-dashboard allow-list and the client guard), plus a Sidebar/BottomNav item before My Future. It resolves the client's record via `useClientWealth` and renders the same component with `viewer="client"`.
- `LiveWorkspace.tsx` / `ClientWorkspace.tsx` stay in the code but are no longer shown on the tab. All stage changes still go through the existing database functions.
- Check with Playwright as the Wealth Manager and as Georgia, at 1280px and 390px.
