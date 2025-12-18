-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Enable realtime for user_invitations table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_invitations;