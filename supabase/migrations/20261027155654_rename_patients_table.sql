-- Rename the core "patients" table (the clients table) to "clients".
-- Column names (patient_id, user_id meaning "owning broker", etc.) are
-- intentionally NOT touched in this pass — that's a much larger, separate
-- rename with its own risk profile.
ALTER TABLE patients RENAME TO clients;
