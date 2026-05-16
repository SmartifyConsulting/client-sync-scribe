import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Siren } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type SosNotif = {
  id: string;
  title: string;
  description: string | null;
  reference_id: string | null;
};

const SEEN_KEY = "sos_alert_seen_ids";

const loadSeen = (): Set<string> => {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
};

const persistSeen = (set: Set<string>) => {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(set).slice(-50)));
  } catch {
    /* ignore */
  }
};

const beep = () => {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.frequency.value = 660;
    }, 200);
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, 600);
  } catch {
    /* ignore */
  }
};

export const SosAlertListener = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState<SosNotif | null>(null);
  const seenRef = useRef<Set<string>>(loadSeen());

  useEffect(() => {
    if (!user?.id) return;

    const handleRow = (row: SosNotif) => {
      if (!row?.id || seenRef.current.has(row.id)) return;
      seenRef.current.add(row.id);
      persistSeen(seenRef.current);

      try {
        navigator.vibrate?.([400, 150, 400, 150, 400]);
      } catch {
        /* ignore */
      }
      beep();
      toast.error(row.title, {
        description: row.description ?? "Tap to view live tracking",
        duration: 10000,
        action: row.reference_id
          ? {
              label: "Open",
              onClick: () => navigate(`/patient/holarchelp/incident/${row.reference_id}`),
            }
          : undefined,
      });
      setActive(row);
    };

    // Catch any unseen sos_alerts from the last hour on mount
    (async () => {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("notifications")
        .select("id, title, description, reference_id, is_read, created_at")
        .eq("user_id", user.id)
        .eq("type", "sos_alert")
        .eq("is_read", false)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1);
      const row = data?.[0] as SosNotif | undefined;
      if (row) handleRow(row);
    })();

    const channel = supabase
      .channel(`sos-alerts-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row?.type !== "sos_alert") return;
          handleRow({
            id: row.id,
            title: row.title,
            description: row.description,
            reference_id: row.reference_id,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, navigate]);

  if (!active) return null;

  return (
    <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
      <DialogContent className="border-4 border-red-600 bg-red-50 dark:bg-red-950/40 max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-2">
            <div className="rounded-full bg-red-600 p-4 animate-pulse">
              <Siren className="h-10 w-10 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl text-red-700 dark:text-red-300">
            {active.title}
          </DialogTitle>
          <DialogDescription className="text-center text-base text-red-900 dark:text-red-100">
            {active.description ?? "An emergency SOS has been triggered. Open live tracking now."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setActive(null)}
          >
            Dismiss
          </Button>
          <Button
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
            onClick={() => {
              if (active.reference_id) {
                navigate(`/patient/holarchelp/incident/${active.reference_id}`);
              }
              setActive(null);
            }}
          >
            Open live tracking →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SosAlertListener;
