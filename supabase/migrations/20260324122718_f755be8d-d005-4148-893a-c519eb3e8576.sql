
-- Fix: Replace overly permissive notifications INSERT policy
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- Only authenticated users can insert notifications for themselves
-- Edge functions use service-role key which bypasses RLS for system notifications
CREATE POLICY "Users can insert their own notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
