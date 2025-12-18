-- Create health_photos table for tracking health behavior photos
CREATE TABLE public.health_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('gym', 'healthy_meal', 'medication')),
  ai_validation_result JSONB,
  is_validated BOOLEAN DEFAULT false,
  lollipops_awarded INTEGER DEFAULT 0,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  photo_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.health_photos ENABLE ROW LEVEL SECURITY;

-- Patients can view their own health photos
CREATE POLICY "Patients can view their own health photos"
ON public.health_photos
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM patients p
  WHERE p.id = health_photos.patient_id
  AND p.patient_user_id = auth.uid()
));

-- Patients can create their own health photos
CREATE POLICY "Patients can create their own health photos"
ON public.health_photos
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM patients p
  WHERE p.id = health_photos.patient_id
  AND p.patient_user_id = auth.uid()
));

-- Patients can delete their own health photos
CREATE POLICY "Patients can delete their own health photos"
ON public.health_photos
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM patients p
  WHERE p.id = health_photos.patient_id
  AND p.patient_user_id = auth.uid()
));

-- Doctors can view health photos for their patients
CREATE POLICY "Doctors can view health photos for their patients"
ON public.health_photos
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM patients p
  WHERE p.id = health_photos.patient_id
  AND p.user_id = auth.uid()
));

-- Create index for efficient querying
CREATE INDEX idx_health_photos_patient_date ON public.health_photos(patient_id, photo_date);
CREATE INDEX idx_health_photos_category ON public.health_photos(category);

-- Create storage bucket for health photos
INSERT INTO storage.buckets (id, name, public) VALUES ('health-photos', 'health-photos', true);

-- Storage policies
CREATE POLICY "Users can upload health photos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'health-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Health photos are publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'health-photos');

CREATE POLICY "Users can delete their health photos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'health-photos' AND auth.uid()::text = (storage.foldername(name))[1]);