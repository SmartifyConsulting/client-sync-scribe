-- Per-broker "Password Protector" passcode used to gate App Integrations
-- credentials. Separate from the broker's account login password.

CREATE TABLE broker_security_settings (
  broker_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  password_protector_hash text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE broker_security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage own security settings"
  ON broker_security_settings FOR ALL
  TO authenticated
  USING (broker_user_id = auth.uid())
  WITH CHECK (broker_user_id = auth.uid());

CREATE TRIGGER trg_security_settings_updated_at
  BEFORE UPDATE ON broker_security_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
