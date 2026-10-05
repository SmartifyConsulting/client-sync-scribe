import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

/** Read-only audit trail of every recorded Live Workspace action for one client. */
export function TransactionLogs({ patientId }: { patientId?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["wealth-audit-log", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data: rows } = await db.from("wealth_audit_log").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(500);
      const ids = [...new Set(((rows ?? []) as any[]).map((r) => r.actor_user_id).filter(Boolean))];
      const { data: people } = ids.length ? await db.from("profiles").select("id,full_name").in("id", ids) : { data: [] };
      const names = new Map(((people ?? []) as any[]).map((p) => [p.id, p.full_name]));
      return ((rows ?? []) as any[]).map((r) => ({ ...r, actor: r.actor_user_id ? names.get(r.actor_user_id) || "Unknown user" : "System" }));
    },
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (!data?.length) return <p className="empty-state">No activity recorded yet.</p>;

  const groups = new Map<string, any[]>();
  for (const r of data) {
    const key = new Date(r.created_at).toLocaleDateString("en-ZA", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([day, rows]) => (
        <div key={day} className="frame overflow-x-auto">
          <p className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 border-b border-border/60">{day}</p>
          <table className="data-table w-full text-xs">
            <thead><tr><th className="text-left">Time</th><th className="text-left">Action</th><th className="text-left">Details</th><th className="text-left">By</th></tr></thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-t border-border/60 align-top">
                  <td className="whitespace-nowrap py-2 pr-3 text-muted-foreground">{new Date(r.created_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="py-2 pr-3 font-medium text-foreground">{r.action}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{r.details ?? "—"}</td>
                  <td className="whitespace-nowrap py-2">{r.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
