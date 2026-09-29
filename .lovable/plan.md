# Live Workspace (Izenzo style) for Wealth Manager and Client

## What you will see
- **Client menu:** a new "Live Workspace" item between My Profile and My Future.
- **Wealth Manager, on a client record:** the current "Live" and "Workflow" tabs become a single "Live Workspace" tab. The separate Workflow tab goes away, but nothing in it is lost: its map moves into the workspace.
- **Real time:** both people see the same workspace. When a document is uploaded, a form is signed, or a stage moves on, it updates live for both.

## Layout (from the Izenzo template, in Holarc colours, rounded shapes)
```text
+-----------------------------------------+---------------------------+
| WORKFLOW MAP                [MAP|STEPS] | LIVE WORKSPACE  LW-CASE-xx|
|  1 Client Gateway  ->  2 Portfolio      |  STEP 1 · CLIENT GATEWAY ✓|
|  6 Issuance            3 Needs Analysis |  STEP 2 · PORTFOLIO    (−)|
|  5 Presentation  <- 4 Quotes & ROA      |    now / next / waiting / |
|  [Documents (n)]                        |    blocked items          |
+-----------------------------------------+---------------------------+
| [client tab] ........................................ [refresh]     |
+---------------------------------------------------------------------+
```
- **Left side:** the workflow map. The 6 existing groups each sit in a white frame with a thin grey border, running round the edge of the map (1 top, 2 and 3 down the right, 4 at the bottom, 5 bottom-left, 6 up the left). Each group's steps are pills inside its frame, joined by fine grey arrows. The MAP | STEPS switch shows either this map or a vertical list of the steps.
- **Right side:** six stacked stage bars, one per group. Only the current stage is open, and inside it the existing Now, Next, Waiting, Blocked and Completed items are shown, with reasons for anything blocked. Finished stages collapse with a tick.
- **Documents:** a tile on the map with a count. Clicking it opens the client's documents.
- **Pulsing:** only the one next action for whoever is looking pulses. It is the Wealth Manager's action on their screen and the client's action on theirs. The client sees a read-only view in a blue accent, with only their own actions available (sign, upload, acknowledge).
- **Mobile:** the stages stack from 1 to 6 and the stage bars drop below the map.
- **Bottom bar:** a slim bar with the case tab and a refresh button. The Wealth Manager's bar also has tabs for recently opened clients.

## Technical details
- New `src/features/wealth-workflow/live/`: `LiveWorkspaceShell.tsx` (split grid), `WorkflowCanvas.tsx` (perimeter map + SVG arrows, STEPS view), `GateTray.tsx`, `WorkspaceTaskbar.tsx`, `lexicon.ts` (all labels in one place, wealth wording). It reuses `useWorkflowMap`, `useLiveWorkspace`, `useWorkflowRealtime` and `groups.ts`, so it adds no new data logic, and all stage changes still go through the existing database functions.
- `PatientProfile.tsx`: remove the `workflow` trigger and content, rename `live` to "Live Workspace", render the new shell. Old `?tab=workflow` links redirect to `live`.
- Client: a new route `/my-workspace` (added to the shared-dashboard allow-list in AppLayout and to the client guard), and a Sidebar/BottomNav item before My Future. It resolves the client's own record through `useClientWealth` and renders the same shell with `viewer="client"`.
- Pulse animations (`animate-throb`) are added to tailwind.config using the existing `--primary`, plus a blue counterparty accent token. Semantic tokens only.
- The Wealth Manager's taskbar tabs use localStorage for now (no new table).
- The existing `WorkflowMap`, `LiveWorkspace` and `ClientWorkspace` files are kept, not deleted.
- Check with Playwright at 1280px and 390px, as both the Wealth Manager and Georgia.
- The answers (6 stages, app colours, rounded, tab on the client record) will be saved to project memory.
