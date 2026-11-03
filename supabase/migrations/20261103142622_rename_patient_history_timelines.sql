-- patient_history_timelines powers the live "Client Overview" AI recap —
-- a genuine wealth feature, just medically named. A straight RENAME keeps
-- the table's OID, data, indexes and FK relationships intact (same pattern
-- as doctor_patient_access -> broker_client_access in
-- 20261027155502_rename_shared_tables_batch1.sql).
ALTER TABLE public.patient_history_timelines RENAME TO client_history_timelines;
