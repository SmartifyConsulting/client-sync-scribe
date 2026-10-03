import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Check, X, Clock, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface PatientRequest {
  id: string;
  doctor_id: string;
  patient_id: string;
  patient_user_id: string;
  service_id: string | null;
  requested_start: string;
  requested_end: string;
  proposed_start: string | null;
  proposed_end: string | null;
  status: string;
  notes: string | null;
  doctor_name?: string;
  service_name?: string;
}

export function PatientRequestsBadge() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<PatientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchRequests();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("appointment-requests-patient")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "appointment_requests",
        filter: `patient_user_id=eq.${user.id}`,
      }, () => fetchRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("appointment_requests")
        .select("*")
        .eq("patient_user_id", user.id)
        .in("status", ["pending", "proposed"])
        .order("created_at", { ascending: false }) as any;

      const reqs: PatientRequest[] = data || [];

      // Enrich with doctor names
      const doctorIds = [...new Set(reqs.map((r) => r.doctor_id))];
      let doctorMap: Record<string, string> = {};
      if (doctorIds.length) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", doctorIds);
        (profiles || []).forEach((p) => { doctorMap[p.id] = p.full_name || "Doctor"; });
      }

      setRequests(reqs.map((r) => ({ ...r, doctor_name: doctorMap[r.doctor_id] })));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmProposed = async (req: PatientRequest) => {
    if (!req.proposed_start || !req.proposed_end) return;
    setActionLoading(req.id);
    try {
      await supabase
        .from("appointment_requests")
        .update({ status: "confirmed" } as any)
        .eq("id", req.id);

      // Create the appointment
      await supabase.from("appointments").insert({
        user_id: req.doctor_id,
        patient_id: req.patient_id,
        title: req.service_name || "Patient Appointment",
        start_time: req.proposed_start,
        end_time: req.proposed_end,
        type: "session",
        description: req.notes,
      });

      await supabase.from("notifications").insert({
        user_id: req.doctor_id,
        type: "appointment_confirmed",
        title: "Appointment Confirmed",
        description: `Patient confirmed the proposed time: ${format(parseISO(req.proposed_start), "MMM d 'at' h:mm a")}.`,
      });

      toast({ title: "Confirmed", description: "Appointment confirmed!" });
      fetchRequests();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineProposed = async (req: PatientRequest) => {
    setActionLoading(req.id);
    try {
      await supabase
        .from("appointment_requests")
        .update({ status: "declined" } as any)
        .eq("id", req.id);

      toast({ title: "Declined", description: "Proposed time declined." });
      fetchRequests();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || requests.length === 0) return null;

  const proposedRequests = requests.filter((r) => r.status === "proposed");
  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">My Appointment Requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {proposedRequests.map((req) => (
          <div key={req.id} className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{req.doctor_name}</span>
              <Badge className="bg-amber-100 text-amber-800 text-xs">New Time Proposed</Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {req.proposed_start && format(parseISO(req.proposed_start), "MMM d, yyyy")}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {req.proposed_start && format(parseISO(req.proposed_start), "h:mm a")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-through">
              Originally: {format(parseISO(req.requested_start), "MMM d 'at' h:mm a")}
            </p>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={() => handleConfirmProposed(req)} disabled={actionLoading === req.id} className="gap-1">
                {actionLoading === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Accept
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDeclineProposed(req)} disabled={actionLoading === req.id} className="gap-1 text-destructive">
                <X className="h-4 w-4" /> Decline
              </Button>
            </div>
          </div>
        ))}
        {pendingRequests.map((req) => (
          <div key={req.id} className="rounded-xl border border-border p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{req.doctor_name}</span>
              <Badge variant="outline" className="text-xs">Pending</Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(parseISO(req.requested_start), "MMM d, yyyy")}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {format(parseISO(req.requested_start), "h:mm a")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Waiting for wealth manager's response...</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
