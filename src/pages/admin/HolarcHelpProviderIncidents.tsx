import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function HolarcHelpProviderIncidents() {
  const { type, id } = useParams<{ type: "hospital" | "ambulance"; id: string }>();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [rows, setRows] = useState<any[]>([]);
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin || !id || !type) return;
    (async () => {
      setLoading(true);
      const tbl = type === "hospital" ? "holarchelp_hospitals" : "holarchelp_ambulance_providers";
      const nameCol = type === "hospital" ? "name" : "company_name";
      const [{ data: prov }, { data: incs }] = await Promise.all([
        supabase.from(tbl as any).select(`id, ${nameCol}, status, country, tier`).eq("id", id).maybeSingle(),
        supabase.from("holarchelp_incidents" as any)
          .select("id, user_id, status, severity, created_at, accepted_at, arrived_at, resolved_at")
          .eq("assigned_provider_id", id)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      setProvider(prov as any);
      const list = (incs as any[]) ?? [];
      const userIds = Array.from(new Set(list.map((i) => i.user_id).filter(Boolean)));
      let names: Record<string, string> = {};
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        for (const p of (profs as any[]) ?? []) names[p.id] = p.full_name ?? "—";
      }
      const ids = list.map((i) => i.id);
      let ratings: Record<string, number> = {};
      if (ids.length) {
        const { data: fb } = await supabase.from("holarchelp_incident_feedback" as any)
          .select("incident_id, rating").in("incident_id", ids);
        for (const f of (fb as any[]) ?? []) ratings[f.incident_id] = f.rating;
      }
      setRows(list.map((i) => ({ ...i, patient_name: names[i.user_id] ?? "—", rating: ratings[i.id] ?? null })));
      setLoading(false);
    })();
  }, [isAdmin, id, type]);

  if (roleLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!isAdmin) return (
    <div className="mx-auto max-w-md p-8 text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
      <p className="mt-4 font-semibold">Admin access required</p>
    </div>
  );

  const totals = {
    count: rows.length,
    accepts: rows.filter((r) => r.accepted_at).length,
    arrived: rows.filter((r) => r.arrived_at).length,
    avgRating: (() => {
      const r = rows.filter((x) => x.rating != null);
      return r.length ? (r.reduce((s, x) => s + x.rating, 0) / r.length).toFixed(1) : "—";
    })(),
  };
  const providerName = provider?.name ?? provider?.company_name ?? "Provider";

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-5">
      <Link to="/admin/users"><Button size="sm" variant="ghost" className="text-primary"><ArrowLeft className="mr-1 h-4 w-4" /> Back to admin</Button></Link>
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Incident history</p>
        <h1 className="text-2xl font-extrabold">{providerName}</h1>
        <p className="text-xs text-muted-foreground">{provider?.country ?? "—"} · {provider?.tier ?? "—"} · <span className="capitalize">{provider?.status}</span></p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><p className="text-sm text-muted-foreground">Total</p><p className="text-xl font-bold">{totals.count}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-sm text-muted-foreground">Accepted</p><p className="text-xl font-bold">{totals.accepts}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-sm text-muted-foreground">Arrived</p><p className="text-xl font-bold">{totals.arrived}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-sm text-muted-foreground">Avg rating</p><p className="text-xl font-bold">{totals.avgRating}</p></CardContent></Card>
      </div>

      <div className="rounded-2xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Accepted</TableHead>
              <TableHead>Arrived</TableHead>
              <TableHead>Resolved</TableHead>
              <TableHead>Rating</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (<TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="inline h-4 w-4 animate-spin" /></TableCell></TableRow>)}
            {!loading && rows.length === 0 && (<TableRow><TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">No incidents for this provider yet.</TableCell></TableRow>)}
            {!loading && rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{format(parseISO(r.created_at), "MMM d, HH:mm")}</TableCell>
                <TableCell className="text-xs">{r.patient_name}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize text-xs">{r.severity ?? "—"}</Badge></TableCell>
                <TableCell><Badge variant="outline" className="capitalize text-xs">{r.status}</Badge></TableCell>
                <TableCell className="text-xs">{r.accepted_at ? format(parseISO(r.accepted_at), "HH:mm") : "—"}</TableCell>
                <TableCell className="text-xs">{r.arrived_at ? format(parseISO(r.arrived_at), "HH:mm") : "—"}</TableCell>
                <TableCell className="text-xs">{r.resolved_at ? format(parseISO(r.resolved_at), "HH:mm") : "—"}</TableCell>
                <TableCell className="text-xs">{r.rating ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
