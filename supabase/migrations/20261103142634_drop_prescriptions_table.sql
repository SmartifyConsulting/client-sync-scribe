-- Nothing in the live app writes or reads prescriptions anymore — the
-- auto-generated clinical-document feature that used it was removed
-- earlier, and the chronic-meds-to-prescriptions sync in
-- ClientDetailsEditor.tsx and the write_prescription voice-command action
-- in process-todo-actions have both been removed in this same pass. The
-- only remaining reference was in ClientDashboard.tsx, which is dead code
-- (imported in src/App.tsx but never routed — unreachable).
DROP TABLE IF EXISTS public.prescriptions CASCADE;
