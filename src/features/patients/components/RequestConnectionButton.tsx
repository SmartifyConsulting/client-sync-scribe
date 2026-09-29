import { useState, useEffect } from "react";
import { UserPlus, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RequestConnectionButtonProps {
  patientUserId: string | null;
  patientName: string;
}

export function RequestConnectionButton({ patientUserId, patientName }: RequestConnectionButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'connected'>('none');
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    checkConnectionStatus();
  }, [patientUserId]);

  const checkConnectionStatus = async () => {
    if (!patientUserId) {
      setCheckingStatus(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCheckingStatus(false);
        return;
      }

      // Check if already connected
      const { data: existingConnection } = await supabase
        .from('user_invitations')
        .select('status')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${patientUserId}),and(sender_id.eq.${patientUserId},recipient_id.eq.${user.id})`)
        .in('status', ['pending', 'accepted'])
        .maybeSingle();

      if (existingConnection) {
        setConnectionStatus(existingConnection.status === 'accepted' ? 'connected' : 'pending');
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleRequestConnection = async () => {
    if (!patientUserId) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to request a connection",
          variant: "destructive",
        });
        return;
      }

      // Get current user's profile for the notification
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('full_name, specialty')
        .eq('id', user.id)
        .single();

      // Create invitation record (email is optional for in-app connections)
      const { error: inviteError } = await supabase
        .from('user_invitations')
        .insert({
          sender_id: user.id,
          recipient_id: patientUserId,
          recipient_email: patientName, // Use patient name as identifier
          status: 'pending',
          message: `Dr. ${senderProfile?.full_name || 'Your doctor'} would like to connect with you on the platform.`,
        });

      if (inviteError) throw inviteError;

      // Create notification for the patient
      const senderName = senderProfile?.full_name || 'A doctor';
      const specialty = senderProfile?.specialty ? ` [${senderProfile.specialty}]` : '';

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: patientUserId,
          type: 'invitation_received',
          title: 'Connection Request',
          description: `${senderName}${specialty} has requested to connect with you.`,
          reference_id: user.id,
        });

      if (notifError) throw notifError;

      setConnectionStatus('pending');
      toast({
        title: "Connection Requested",
        description: `Your connection request has been sent to ${patientName}.`,
      });
    } catch (error: any) {
      console.error('Error requesting connection:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send connection request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't show if patient doesn't have a linked account
  if (!patientUserId) return null;

  if (checkingStatus) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-1.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking...
      </Button>
    );
  }

  if (connectionStatus === 'connected') {
    return (
      <Button variant="outline" size="sm" disabled className="gap-1.5 text-primary border-primary/40 bg-sky-50">
        <Check className="h-3.5 w-3.5" />
        Connected
      </Button>
    );
  }

  if (connectionStatus === 'pending') {
    return (
      <Button variant="outline" size="sm" disabled className="gap-1.5 text-amber-600 border-amber-200 bg-amber-50">
        <Loader2 className="h-3.5 w-3.5" />
        Pending
      </Button>
    );
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="gap-1.5"
      onClick={handleRequestConnection}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <UserPlus className="h-3.5 w-3.5" />
      )}
      Connect
    </Button>
  );
}
