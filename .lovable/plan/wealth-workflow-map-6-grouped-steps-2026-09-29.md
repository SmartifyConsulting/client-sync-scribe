# Wealth Workflow Map (6 grouped steps)

## Goal
Add an interactive map of each client's workflow, laid out in the 6 grouped steps from your reference image. Each group lists its sub-steps with an owner badge. The map only shows what the workflow engine has already decided: there are no manual toggles and no second copy of the workflow.

## The 6 groups and their sub-steps
Each sub-step carries an owner badge (CLIENT, SYSTEM, ADVISOR, INSURER).

```text
1 Client Gateway        CLIENT  Scan QR or open secure link
                        SYSTEM  Liveness and Home Affairs ID
                        footer: No advice until all four pass
2 Portfolio             SYSTEM  Astute pull: life, disability, investments
                        SYSTEM  Insurer schedules and claims history
                        SYSTEM  Cross-alert check
                        SYSTEM  Push profile to CRM
                        footer: Locked until the mandate is re-signed if another brokerage queries
3 Needs Analysis        ADVISOR Capture facts and risk profile
                        SYSTEM  Life, short-term and investment gaps
                        SYSTEM  Estate duty estimate
                        CLIENT  Or: single-need disclaimer
4 Quotes & ROA          SYSTEM  Quote 6 insurers, rank top 3
                        ADVISOR Select options and commentary
                        SYSTEM  Affordability check
                        SYSTEM  Generate ROA (versioned)
                        footer: Any change makes a new version, re-sign
5 Presentation          ADVISOR Present ROA and comparison
                        CLIENT  Sign ROA
                        CLIENT  FICA documents and bank validation
                        CLIENT  Debit order and life declaration
                        CLIENT  Health disclosure (encrypted)
                        footer: Submission blocked until complete
6 Issuance & Review     INSURER Accept, decline or issue
                        SYSTEM  Policy schedule to portal and CRM
                        SYSTEM  Schedule annual review
                        CLIENT  Acknowledge renewal
                        footer: Repeats every 12 months
```

## How the engine's 15 stages fit into the groups
- 1 Client Gateway: Consultation, Information Required
- 2 Portfolio: Information Required (data gathering)
- 3 Needs Analysis: Needs Analysis
- 4 Quotes & ROA: Research / Quotes, Recommendation
- 5 Presentation: Client Presentation, Client Decision, Documentation, Compliance
- 6 Issuance & Review: Application, Underwriting, Submission, Issued, Follow-up, Annual Review

The engine keeps its 15 stages unchanged. This mapping only decides how they are grouped on screen.

## What you see
- **Group states:** each group shows Completed, Current ("You are here" highlight), Pending, Blocked (red, with a lock line listing what's missing), Waiting (e.g. "Waiting for client", "Waiting for insurer") or Not applicable. The state comes from the engine's current stage, status and missing items, plus the open actions and who owns them.
- **Sub-step markers:** each sub-step shows a tick, a "Next" dot or a pending state. The tick comes from real records where they exist: the ROA version, signed ROA, FICA and bank checks, declarations, application status and the review date. Sub-steps with nothing to check against yet (QR, liveness, Astute pull, insurer quotes) show as pending, labelled "not yet connected".
- **Groups expand and collapse** like the image. Clicking a group opens a side panel with the details for its stages: status, owner, outstanding actions (from the existing task list), current recommendation or ROA version and its history, documents, due date, blockers shown as a tick/cross checklist, and the moves the engine allows (Present, decision buttons, Start annual review).
- **Layout:**
  - Desktop: a two-column zig-zag of cards, like the reference, with the Documents tile opening the client's existing documents.
  - Tablet and mobile: a single vertical list.
- **Wealth manager view:** a compact header shows the client name, current stage, status, next action and any blocked item with its reason.
- **Client view:** a simplified "Your wealth journey" with plain labels, plus one plain-language message. Examples: "You have 2 actions to complete" or "Your application is being processed". Internal system steps are hidden from the client.

## Where it appears
- A new "Workflow" tab on the practitioner's client profile.
- A "My Journey" card on the client's own profile.
- If the client has no workflow yet, a single "Start workflow" button appears. It calls the engine.

## Design
Clean white or neutral cards, thin borders, and a teal accent only for the current group. Owner badges use restrained colours: client teal, advisor blue, insurer amber, system grey. Compact type, no hero sections, and no other screens change.

## Technical details
- New files in `src/features/wealth-workflow/map/`:
  - `groups.ts`: the group, sub-step and stage mapping, plus the rule for each sub-step's tick.
  - `useWorkflowMap.ts`: combines `useClientWorkflow`, `useStageDefs`, `useRecommendationHistory`, the blockers and new read-only queries for applications, compliance checks, workflow-linked tasks and tagged documents into a view model.
  - `WorkflowMap.tsx`, `WorkflowGroupCard.tsx`, `StageDetailSheet.tsx` (shadcn Sheet), `ClientJourney.tsx`.
- All state changes go through the existing engine functions (the existing hooks). The map never writes a stage.
- Waiting is decided from open workflow tasks at the current stage, using their owner role. Blocked comes from the engine's status and missing items.
- Owner badge colours are added as theme tokens in `index.css`.
- The tab is placed in the existing client profile tab list, and the client card on the patient profile page. The exact files are confirmed during the build.
