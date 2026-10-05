import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";

const db = supabase as any;

const fmt = (d: string) => new Date(d).toLocaleString("en-ZA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Firm-wide audit trail across every client — same records as the per-client
 *  TransactionLogs panel, just not scoped to one patient. */
export default function ActivityLog() {
  const { user } = useAuth();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["wealth-activity-log", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: patients } = await db.from("patients").select("id,name").eq("user_id", user!.id);
      const ids = (patients ?? []).map((p: any) => p.id);
      if (!ids.length) return [];
      const namesByPatient = new Map((patients ?? []).map((p: any) => [p.id, p.name]));

      const { data: rows } = await db.from("wealth_audit_log").select("*").in("patient_id", ids).order("created_at", { ascending: false }).limit(500);
      const actorIds = [...new Set(((rows ?? []) as any[]).map((r) => r.actor_user_id).filter(Boolean))];
      const { data: people } = actorIds.length ? await db.from("profiles").select("id,full_name").in("id", actorIds) : { data: [] };
      const names = new Map(((people ?? []) as any[]).map((p: any) => [p.id, p.full_name]));

      return ((rows ?? []) as any[]).map((r) => ({
        ...r,
        actor: r.actor_user_id ? names.get(r.actor_user_id) || "User" : "System",
        client: namesByPatient.get(r.patient_id) || "—",
      }));
    },
  });

  const filtered = (data ?? []).filter((r: any) => {
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return [r.action, r.details, r.actor, r.client].some((v) => String(v ?? "").toLowerCase().includes(needle));
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader title="Activity Log" subtitle="Every recorded action across all your clients, newest first." />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search action, client or user" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : !filtered.length ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60 text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Date &amp; time</th>
                <th className="px-4 py-2 font-medium">Client</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Details</th>
                <th className="px-4 py-2 font-medium">By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr key={r.id} className="border-b border-border/40 align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{fmt(r.created_at)}</td>
                  <td className="whitespace-nowrap px-4 py-2 font-medium text-foreground">{r.client}</td>
                  <td className="px-4 py-2 font-medium text-foreground">{r.action}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.details ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2">{r.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
