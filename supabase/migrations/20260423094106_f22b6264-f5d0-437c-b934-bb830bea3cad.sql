ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_status_check;
ALTER TABLE patients ADD CONSTRAINT patients_status_check
  CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text]));

DO $$
DECLARE
  user_uuid uuid;
  survivor_id uuid;
  dup_id uuid;
BEGIN
  FOR user_uuid IN
    SELECT patient_user_id
    FROM patients
    WHERE patient_user_id IS NOT NULL
      AND COALESCE(status, 'active') <> 'archived'
    GROUP BY patient_user_id
    HAVING COUNT(*) > 1
  LOOP
    SELECT p.id INTO survivor_id
    FROM patients p
    LEFT JOIN (
      SELECT patient_id, COUNT(*) AS rx_count
      FROM prescriptions
      WHERE status = 'active'
      GROUP BY patient_id
    ) r ON r.patient_id = p.id
    WHERE p.patient_user_id = user_uuid
      AND COALESCE(p.status, 'active') <> 'archived'
    ORDER BY COALESCE(r.rx_count, 0) DESC, p.created_at ASC
    LIMIT 1;

    FOR dup_id IN
      SELECT id FROM patients
      WHERE patient_user_id = user_uuid
        AND id <> survivor_id
        AND COALESCE(status, 'active') <> 'archived'
    LOOP
      UPDATE prescriptions          SET patient_id = survivor_id WHERE patient_id = dup_id;
      UPDATE medication_adherence   SET patient_id = survivor_id WHERE patient_id = dup_id;
      UPDATE health_photos          SET patient_id = survivor_id WHERE patient_id = dup_id;
      UPDATE documents              SET patient_id = survivor_id WHERE patient_id = dup_id;
      UPDATE appointments           SET patient_id = survivor_id WHERE patient_id = dup_id;
      UPDATE hospital_admissions    SET patient_id = survivor_id WHERE patient_id = dup_id;
      UPDATE patient_rewards        SET patient_id = survivor_id WHERE patient_id = dup_id;
      UPDATE image_comparisons      SET patient_id = survivor_id WHERE patient_id = dup_id;
      UPDATE invoices               SET patient_id = survivor_id WHERE patient_id = dup_id;
      UPDATE appointment_requests   SET patient_id = survivor_id WHERE patient_id = dup_id;
      UPDATE emoticon_messages      SET patient_id = survivor_id WHERE patient_id = dup_id;
      UPDATE messages               SET patient_id = survivor_id WHERE patient_id = dup_id;
      UPDATE sessions               SET patient_id = survivor_id WHERE patient_id = dup_id;
      UPDATE round_table_notes      SET patient_id = survivor_id WHERE patient_id = dup_id;
      UPDATE prescription_pill_references SET patient_id = survivor_id WHERE patient_id = dup_id;
      UPDATE patient_streaks        SET patient_id = survivor_id WHERE patient_id = dup_id;

      UPDATE patients s
      SET
        is_chronic = COALESCE(s.is_chronic, false) OR COALESCE(d.is_chronic, false),
        chronic_medications = COALESCE(NULLIF(s.chronic_medications, ''), d.chronic_medications),
        current_medications = (
          SELECT to_jsonb(array_agg(elem))
          FROM (
            SELECT jsonb_array_elements(COALESCE(s.current_medications, '[]'::jsonb)) AS elem
            UNION
            SELECT jsonb_array_elements(COALESCE(d.current_medications, '[]'::jsonb)) AS elem
          ) all_meds
        ),
        conditions_diagnoses = (
          SELECT to_jsonb(array_agg(elem))
          FROM (
            SELECT jsonb_array_elements(COALESCE(s.conditions_diagnoses, '[]'::jsonb)) AS elem
            UNION
            SELECT jsonb_array_elements(COALESCE(d.conditions_diagnoses, '[]'::jsonb)) AS elem
          ) all_conds
        )
      FROM patients d
      WHERE s.id = survivor_id AND d.id = dup_id;

      UPDATE patients
      SET status = 'archived',
          patient_user_id = NULL,
          updated_at = now()
      WHERE id = dup_id;
    END LOOP;
  END LOOP;
END $$;