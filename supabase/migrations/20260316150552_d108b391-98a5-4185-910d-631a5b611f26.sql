-- Add pharmacy fields to patients
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pharmacy_name text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pharmacy_email text;

-- Add media support to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS media_type text;

-- Create patient-media storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('patient-media', 'patient-media', true) ON CONFLICT (id) DO NOTHING;

-- RLS policies for patient-media bucket
CREATE POLICY "Authenticated users can upload media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'patient-media');
CREATE POLICY "Authenticated users can view media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'patient-media');
CREATE POLICY "Users can delete their media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'patient-media');