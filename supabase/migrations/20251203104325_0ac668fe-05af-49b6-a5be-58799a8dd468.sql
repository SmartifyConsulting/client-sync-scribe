-- Add policy to allow authenticated users to view demo patients
CREATE POLICY "Users can view demo patients" 
ON public.patients 
FOR SELECT 
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid AND auth.role() = 'authenticated');