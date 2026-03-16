
-- Add pharmacies JSONB column to patients
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pharmacies jsonb DEFAULT '[]'::jsonb;

-- Add narration_voice to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS narration_voice text DEFAULT 'nova';

-- Create referral_doctors table
CREATE TABLE IF NOT EXISTS referral_doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  practice_number text,
  address text,
  email text,
  phone text,
  referral_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE referral_doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their referral doctors" ON referral_doctors FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create cpd_certificates table
CREATE TABLE IF NOT EXISTS cpd_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  certificate_name text NOT NULL,
  issuing_body text,
  date_earned date NOT NULL,
  cpd_points integer DEFAULT 0,
  certificate_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE cpd_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their CPD certificates" ON cpd_certificates FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
