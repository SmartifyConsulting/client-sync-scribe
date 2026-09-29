# Wealth Workflow Engine (thin layer over existing Holarc objects)

## Goal
Every client (patient record) gets a current wealth workflow stage. The stage comes from real records, moves only through allowed transitions, shows exactly why it is blocked, and keeps a full audit history. No Workflow Map or Live Workspace in this task. Existing screens stay as they are.

## Reuse (no duplicates)
- Client = `patients`, Wealth Manager = doctor profile, Firm = `practices`
- Consultation = `sessions`
- Actions = `todos`. Owner, due date, priority, status and completion already exist. It gets a few extra link columns.
- Documents = `documents`. Signed ROA, proof of residence, FICA and similar files are tagged with a document kind.
- Appointments = `appointments`. The Annual Review consultation is booked here.

## New database pieces (minimal)
1. `wealth_workflows`: one active row per client cycle. Holds client, firm, owner, current stage, status (active / blocked / closed_declined / completed), cycle number and next review date.
2. `wealth_workflow_stage_defs`: seeded reference table with the 15 stages. For each stage: owner role, required info, required document kinds, dependencies and allowed next stages.
3. `wealth_recommendations`: versioned, never overwritten. Holds workflow, version, ROA document link, status (draft / presented / accepted / declined / changes_requested / superseded), presented_at, decided_at and decision reason. A revision adds a new version and marks the previous one `superseded`.
4. `wealth_applications`: product, provider, status (draft / ready / underwriting / submitted / issued), submitted_at, issued_at and review date.
5. `wealth_compliance_checks`: per workflow. Holds kyc_fica, bank_validation and declarations, each with a status and a completed_at date.
6. `wealth_workflow_transitions`: append-only audit. Records from stage, to stage, actor (user or system), reason, related record type and id, decision, and timestamp.
7. Extend `todos` with nullable columns: `workflow_id`, `workflow_stage`, `owner_role` (client, wealth_manager, firm, key_individual, provider, operations, system), `recommendation_id`, `application_id` and `product`. Existing task screens keep working.
8. Extend `documents` with a nullable `document_kind` column (roa, proof_of_residence, id_document, bank_confirmation, declaration and similar).

All new tables are created with GRANTs and RLS. Access is limited to the owning wealth manager, practice members and the client (read-only).

## Engine (database functions, one source of truth)
- `wealth_derive_stage(workflow_id)`: works out the stage from the records using the brief's rules. A recommendation not yet presented means Recommendation. Presented with no answer means Client Decision. Accepted means Documentation. Missing compliance means Compliance (blocked). An application missing documents means Application (blocked). Submitted means Submission. Issued means Issued, then Follow-up.
- `wealth_blockers(workflow_id, target_stage)`: returns the exact missing items, for example "Client signature on current ROA" or "Proof of residence".
- `wealth_transition(workflow_id, to_stage, reason)`: checks the move is allowed and the blockers list is empty, then writes the audit row. Invalid moves are rejected with the reasons.
- `wealth_record_decision(recommendation_id, decision, reason)`:
  - Accepted goes to Documentation.
  - Declined closes the workflow with the declined outcome.
  - Changes Requested marks the version `changes_requested`, creates a draft for the next version, and returns the workflow to Recommendation. It then follows the usual path through Presentation and Decision.
- Database triggers on recommendations, applications, compliance checks and documents re-run the stage calculation and log each automatic change with actor = system.
- Annual Review: when an application is marked issued, the review date is set (default +12 months) and an action is created. `wealth_start_annual_review(workflow_id)` closes the current cycle and opens cycle N+1 at Consultation. It copies over the previous financial position reference and links the Annual Review appointment and consultation.

## Frontend (thin, no redesign)
- `src/features/wealth-workflow/`: types, a stage config mirror, and hooks: `useClientWorkflow`, `useWorkflowBlockers`, `useTransition`, `useRecordDecision`, `useRecommendationHistory` and `useWorkflowAudit`.
- One small `WorkflowStatusCard` for use on the client profile later. It shows the current stage, a blocked badge with the missing items, allowed next steps, and the decision buttons at Client Decision. It is not placed on any screen in this task unless you ask.

## Success check
Seed one test client, then run the full path through SQL and the hooks: normal path, blocked Application, Changes Requested then a re-presented new ROA version, Declined, and Issued followed by Annual Review. After each run, check the audit rows and the list of blockers.

## Technical notes
- Stage keys: consultation, information_required, needs_analysis, research_quotes, recommendation, client_presentation, client_decision, documentation, compliance, application, underwriting, submission, issued, follow_up, annual_review, plus the closed_declined outcome.
- Transition functions run with elevated database rights, check the caller's access to the client first, and set a fixed schema search path.
- Record in AGENTS.md: "Wealth workflow state is derived and changed only by DB functions; UI never writes stage directly."
