import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/** Toasts hospital staff when a new patient is routed to their ER. */
export function HospitalInboundListener() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`hospital-inbound-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (p) => {
        const n: any = p.new;
        if (n?.type !== "hospital_inbound_patient") return;
        toast.message(n.title ?? "Incoming patient", {
          description: n.description,
          action: n.reference_id ? {
            label: "Open",
            onClick: () => navigate(`/provider/hospital/incident/${n.reference_id}`),
          } : undefined,
          duration: 12_000,
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, navigate]);

  return null;
}
