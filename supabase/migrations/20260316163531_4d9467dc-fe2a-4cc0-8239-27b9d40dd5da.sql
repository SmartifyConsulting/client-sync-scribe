ALTER TABLE referral_doctors ADD COLUMN IF NOT EXISTS specialty text;

INSERT INTO storage.buckets (id, name, public) VALUES ('cpd-certificates', 'cpd-certificates', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload CPD certificates" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cpd-certificates');
CREATE POLICY "Users can view CPD certificates" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'cpd-certificates');
CREATE POLICY "Users can delete CPD certificates" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'cpd-certificates');