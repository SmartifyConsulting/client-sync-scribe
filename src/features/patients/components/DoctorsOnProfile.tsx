import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import {
  User,
  Loader2,
  Mail,
  Send,
  Shield,
  Eye,
  Calendar,
  FileText,
  Pill,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PermissionTransparencyModal } from "@/components/permissions/PermissionTransparencyModal";

interface DoctorAccess {
  id: string;
  doctor_id: string;
  permissions: string[];
  granted_at: string;
  doctor_profile: {
    full_name: string | null;
    practice_number: string | null;
    doctor_number: string | null;
  } | null;
}

interface DoctorsOnProfileProps {
  patientId: string;
  patientName: string;
}

const permissionLabels: Record<string, { label: string; icon: React.ComponentType<any> }> = {
  patient_info: { label: "Client Info", icon: Eye },
  calendar: { label: "Calendar", icon: Calendar },
  session_summaries: { label: "Consultations", icon: FileText },
  prescription_history: { label: "Prescriptions", icon: Pill },
};

export function DoctorsOnProfile({ patientId, patientName }: DoctorsOnProfileProps) {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [doctors, setDoctors] = useState<DoctorAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorAccess | null>(null);
  const [messageForm, setMessageForm] = useState({ subject: "", content: "" });
  const [isSending, setIsSending] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchDoctors();
    }
  }, [patientId, currentUserId]);

  // Check for reply parameter
  useEffect(() => {
    const replyTo = searchParams.get('reply');
    if (replyTo && doctors.length > 0) {
      const doctor = doctors.find(d => d.doctor_id === replyTo);
      if (doctor) {
        openMessageDialog(doctor);
      }
    }
  }, [searchParams, doctors]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchDoctors = async () => {
    try {
      // Get the patient record to find the patient_user_id
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('patient_user_id')
        .eq('id', patientId)
        .maybeSingle();

      if (patientError) throw patientError;

      if (!patient?.patient_user_id) {
        setDoctors([]);
        setLoading(false);
        return;
      }

      // Get all doctors with access to this patient
      const { data: accessData, error } = await supabase
        .from('doctor_patient_access')
        .select(`
          id,
          doctor_id,
          permissions,
          granted_at
        `)
        .eq('patient_user_id', patient.patient_user_id)
        .eq('is_active', true);

      if (error) throw error;
      
      // Fetch doctor profiles separately
      const doctorsWithProfiles = await Promise.all((accessData || []).map(async (access) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, practice_number, doctor_number')
          .eq('id', access.doctor_id)
          .maybeSingle();
        
        return {
          ...access,
          doctor_profile: profile,
        };
      }));

      setDoctors(doctorsWithProfiles);
    } catch (error: any) {
      console.error("Error fetching doctors:", error);
      toast({
        title: "Error",
        description: "Failed to load wealth managers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openMessageDialog = (doctor: DoctorAccess) => {
    setSelectedDoctor(doctor);
    setMessageForm({ 
      subject: `Regarding patient: ${patientName}`, 
      content: "" 
    });
    setShowMessageDialog(true);
  };

  const sendMessage = async () => {
    if (!selectedDoctor || !currentUserId) return;
    
    if (!messageForm.subject.trim() || !messageForm.content.trim()) {
      toast({
        title: "Missing Fields",
        description: "Please fill in both subject and message",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUserId,
          recipient_id: selectedDoctor.doctor_id,
          patient_id: patientId,
          subject: messageForm.subject,
          content: messageForm.content,
        });

      if (error) throw error;

      toast({
        title: "Message Sent",
        description: `Your message has been sent to ${selectedDoctor.doctor_profile?.full_name}`,
      });
      setShowMessageDialog(false);
      setSelectedDoctor(null);
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (doctors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Shield className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No Other Wealth Managers</p>
        <p className="text-sm text-center max-w-md">
          This patient has not granted access to other doctors yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Attending Wealth Managers</h3>
          <p className="text-sm text-muted-foreground">
            Doctors with access to this patient's profile
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowPermissionModal(true)}>
            <Shield className="h-3.5 w-3.5" />
            View Permissions
          </Button>
          <Badge variant="secondary">{doctors.length} doctor{doctors.length !== 1 ? 's' : ''}</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {doctors.map((doctor) => {
          const isCurrentUser = doctor.doctor_id === currentUserId;
          
          return (
            <div
              key={doctor.id}
              className="rounded-xl border border-primary bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {doctor.doctor_profile?.full_name || "Unknown Doctor"}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Practice: {doctor.doctor_profile?.practice_number || "N/A"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Reg: {doctor.doctor_profile?.doctor_number || "N/A"}
                    </p>
                  </div>
                </div>
                {!isCurrentUser && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => openMessageDialog(doctor)}
                  >
                    <Mail className="h-4 w-4" />
                    Message
                  </Button>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {doctor.permissions.map((permission) => {
                  const config = permissionLabels[permission];
                  if (!config) return null;
                  const Icon = config.icon;
                  return (
                    <Badge key={permission} variant="secondary" className="gap-1">
                      <Icon className="h-4 w-4" />
                      {config.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Permission Transparency Modal */}
      <PermissionTransparencyModal
        open={showPermissionModal}
        onOpenChange={setShowPermissionModal}
        onConfirm={() => setShowPermissionModal(false)}
        confirmLabel="I Understand"
      />

      {/* Message Dialog */}
      {showMessageDialog && selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-primary bg-card p-6 shadow-lg animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Send Message</h2>
                  <p className="text-sm text-muted-foreground">
                    To: {selectedDoctor.doctor_profile?.full_name}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowMessageDialog(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={messageForm.subject}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Message subject..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Message</Label>
                <Textarea
                  id="content"
                  value={messageForm.content}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your message..."
                  className="min-h-[150px]"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setShowMessageDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 gap-2" 
                  onClick={sendMessage}
                  disabled={isSending}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
