import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Calendar, Clock, Check, X, MessageSquare, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface AppointmentRequest {
  id: string;
  patient_user_id: string;
  doctor_id: string;
  patient_id: string;
  service_id: string | null;
  requested_start: string;
  requested_end: string;
  proposed_start: string | null;
  proposed_end: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  // joined
  patient_name?: string;
  service_name?: string;
}

export function AppointmentRequestsPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [proposeDialogOpen, setProposeDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AppointmentRequest | null>(null);
  const [proposedDate, setProposedDate] = useState("");
  const [proposedTime, setProposedTime] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchRequests();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("appointment-requests-doctor")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "appointment_requests",
        filter: `doctor_id=eq.${user.id}`,
      }, () => fetchRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("appointment_requests")
        .select("*")
        .eq("doctor_id", user.id)
        .in("status", ["pending", "proposed"])
        .order("created_at", { ascending: false }) as any;

      if (error) throw error;
      const reqs: AppointmentRequest[] = data || [];

      // Enrich with patient names
      const patientIds = [...new Set(reqs.map((r) => r.patient_id))];
      const patientUserIds = [...new Set(reqs.map((r) => r.patient_user_id))];
      const serviceIds = [...new Set(reqs.filter((r) => r.service_id).map((r) => r.service_id!))];

      let patientMap: Record<string, string> = {};
      let profileMap: Record<string, string> = {};
      let serviceMap: Record<string, string> = {};

      if (patientIds.length) {
        const { data: patients } = await supabase.from("patients").select("id, name").in("id", patientIds);
        (patients || []).forEach((p) => { patientMap[p.id] = p.name; });
      }
      // Fallback: fetch from profiles using patient_user_id
      if (patientUserIds.length) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", patientUserIds);
        (profiles || []).forEach((p) => { if (p.full_name) profileMap[p.id] = p.full_name; });
      }
      if (serviceIds.length) {
        const { data: services } = await supabase.from("service_prices").select("id, service_name").in("id", serviceIds);
        (services || []).forEach((s) => { serviceMap[s.id] = s.service_name; });
      }

      setRequests(
        reqs.map((r) => ({
          ...r,
          patient_name: patientMap[r.patient_id] || profileMap[r.patient_user_id] || "Unknown Patient",
          service_name: r.service_id ? serviceMap[r.service_id] : undefined,
        }))
      );
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (req: AppointmentRequest) => {
    setActionLoading(req.id);
    try {
      // Update status
      const { error: updateErr } = await supabase
        .from("appointment_requests")
        .update({ status: "accepted" } as any)
        .eq("id", req.id);
      if (updateErr) throw updateErr;

      // Create appointment
      const { error: aptErr } = await supabase.from("appointments").insert({
        user_id: req.doctor_id,
        patient_id: req.patient_id,
        title: req.service_name || "Patient Appointment",
        start_time: req.requested_start,
        end_time: req.requested_end,
        type: "session",
        description: req.notes,
      });
      if (aptErr) throw aptErr;

      // Notify patient
      await supabase.from("notifications").insert({
        user_id: req.patient_user_id,
        type: "appointment_accepted",
        title: "Appointment Accepted",
        description: `Your appointment on ${format(parseISO(req.requested_start), "MMM d, yyyy 'at' h:mm a")} has been accepted.`,
      });

      toast({ title: "Accepted", description: "Appointment confirmed and added to your calendar." });
      fetchRequests();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (req: AppointmentRequest) => {
    setActionLoading(req.id);
    try {
      await supabase
        .from("appointment_requests")
        .update({ status: "declined" } as any)
        .eq("id", req.id);

      await supabase.from("notifications").insert({
        user_id: req.patient_user_id,
        type: "appointment_declined",
        title: "Appointment Declined",
        description: `Your appointment request for ${format(parseISO(req.requested_start), "MMM d, yyyy")} has been declined.`,
      });

      toast({ title: "Declined", description: "The appointment request has been declined." });
      fetchRequests();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const openProposeDialog = (req: AppointmentRequest) => {
    setSelectedRequest(req);
    setProposedDate("");
    setProposedTime("");
    setProposeDialogOpen(true);
  };

  const handlePropose = async () => {
    if (!selectedRequest || !proposedDate || !proposedTime) return;
    setActionLoading(selectedRequest.id);
    try {
      const proposedStart = new Date(`${proposedDate}T${proposedTime}`);
      const hour = proposedStart.getHours();
      if (hour < 7 || hour >= 18) {
        toast({ title: "Invalid Time", description: "Appointments must be between 7:00 AM and 6:00 PM.", variant: "destructive" });
        setActionLoading(null);
        return;
      }
      const proposedEnd = new Date(proposedStart.getTime() + 30 * 60000);

      await supabase
        .from("appointment_requests")
        .update({
          status: "proposed",
          proposed_start: proposedStart.toISOString(),
          proposed_end: proposedEnd.toISOString(),
        } as any)
        .eq("id", selectedRequest.id);

      await supabase.from("notifications").insert({
        user_id: selectedRequest.patient_user_id,
        type: "appointment_proposed",
        title: "New Time Proposed",
        description: `Your doctor has proposed a new time: ${format(proposedStart, "MMM d, yyyy 'at' h:mm a")}.`,
      });

      toast({ title: "Proposed", description: "Alternative time sent to patient." });
      setProposeDialogOpen(false);
      fetchRequests();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return null;
  if (requests.length === 0) return null;

  return (
    <>
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-sm">{requests.length}</Badge>
            Appointment Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{req.patient_name}</span>
                </div>
                <Badge variant={req.status === "proposed" ? "secondary" : "outline"} className="text-sm">
                  {req.status}
                </Badge>
              </div>
              {req.service_name && (
                <p className="text-sm text-muted-foreground">Service: {req.service_name}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(parseISO(req.requested_start), "MMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {format(parseISO(req.requested_start), "h:mm a")}
                </span>
              </div>
              {req.notes && <p className="text-sm text-muted-foreground italic">"{req.notes}"</p>}
              {req.status === "proposed" && req.proposed_start && (
                <p className="text-sm text-primary font-medium">
                  Proposed: {format(parseISO(req.proposed_start), "MMM d 'at' h:mm a")} â€” waiting for patient
                </p>
              )}
              {req.status === "pending" && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={() => handleAccept(req)} disabled={actionLoading === req.id} className="gap-1">
                    {actionLoading === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openProposeDialog(req)} disabled={actionLoading === req.id} className="gap-1">
                    <MessageSquare className="h-4 w-4" /> Propose Time
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDecline(req)} disabled={actionLoading === req.id} className="gap-1 text-destructive">
                    <X className="h-4 w-4" /> Decline
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Propose Time Dialog */}
      <Dialog open={proposeDialogOpen} onOpenChange={setProposeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Propose New Time</DialogTitle>
            <DialogDescription>
              Suggest an alternative time for {selectedRequest?.patient_name}. Times must be between 7:00 AM and 6:00 PM.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-foreground">Date</label>
              <Input type="date" value={proposedDate} onChange={(e) => setProposedDate(e.target.value)} min={format(new Date(), "yyyy-MM-dd")} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Time</label>
              <Input type="time" value={proposedTime} onChange={(e) => setProposedTime(e.target.value)} min="07:00" max="17:30" />
            </div>
            <Button className="w-full" onClick={handlePropose} disabled={!proposedDate || !proposedTime || !!actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send Proposed Time
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

