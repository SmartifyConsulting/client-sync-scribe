import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** The existing client access rules govern every result. Household links do not grant access. */
export function ClientCrm() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const records = useQuery({
    queryKey: ["practice-crm-clients", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("clients")
        .select("id,name,email,phone,status,updated_at").eq("user_id", user!.id).order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const duplicates = useMemo(() => {
    const counts = new Map<string, number>();
    for (const record of records.data ?? []) {
      const email = record.email?.trim().toLowerCase();
      if (email) counts.set(email, (counts.get(email) ?? 0) + 1);
    }
    return counts;
  }, [records.data]);
  const shown = (records.data ?? []).filter(record => (!status || record.status === status) &&
    (record.name ?? "").toLowerCase().includes(search.trim().toLowerCase()));

  return <section className="frame space-y-3 p-4 text-xs">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Client CRM</h3>
      <Button asChild size="sm" variant="outline"><Link to="/clients">Manage clients</Link></Button>
    </div>
    <div className="flex flex-wrap gap-2">
      <Input aria-label="Search client names" placeholder="Search client names" value={search} onChange={event => setSearch(event.target.value)} className="sm:max-w-xs" />
      <select aria-label="Client status" className="h-10 rounded-md border border-input bg-background px-2" value={status} onChange={event => setStatus(event.target.value)}>
        <option value="">All client statuses</option>
        {[...new Set((records.data ?? []).map(record => record.status))].sort().map(value => <option key={value}>{value}</option>)}
      </select>
    </div>
    {records.isPending ? <p role="status">Loading your client records…</p> : records.isError ? <p role="alert" className="text-destructive">Client records could not be loaded. <button onClick={() => void records.refetch()} className="underline">Try again</button></p> : <>
      <p className="text-muted-foreground">{shown.length} client records · Most recently updated first</p>
      <div className="overflow-x-auto"><table className="data-table w-full text-left">
        <thead><tr><th>Client</th><th>Status</th><th>Record checks</th><th>Workspace</th></tr></thead>
        <tbody>{shown.map(record => <tr key={record.id}>
          <td><Link className="font-medium text-primary hover:underline" to={"/clients/" + record.id}>{record.name}</Link></td>
          <td>{record.status}</td>
          <td className="text-muted-foreground">{record.email && (duplicates.get(record.email.trim().toLowerCase()) ?? 0) > 1 ? "Shared email · review for duplicates or household membership" : "—"}</td>
          <td><Link className="text-primary hover:underline" to={"/clients/" + record.id + "?tab=workflow"}>Open Live Workspace</Link></td>
        </tr>)}</tbody>
      </table></div>
      {!shown.length && <p className="empty-state">No clients match these filters.</p>}
    </>}
  </section>;
}
