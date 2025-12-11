-- Create storage bucket for session audio recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-audio', 'session-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload audio files
CREATE POLICY "Users can upload their own session audio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'session-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to audio files
CREATE POLICY "Session audio is publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'session-audio');

-- Allow users to delete their own audio files
CREATE POLICY "Users can delete their own session audio"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'session-audio' AND auth.uid()::text = (storage.foldername(name))[1]);