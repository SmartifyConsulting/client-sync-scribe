import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, ShieldAlert, AlertTriangle, ArrowLeft, History } from "lucide-react";

type Row = {
  provider_id: string;
  provider_type: "hospital" | "ambulance";
  name: string;
  status: string;
  country: string | null;
  tier: string | null;
  dispatch_priority: number;
  accepts: number;
  avg_arr_min: number | null;
  cancels: number;
  critical_cancels: number;
  stalled: number;
  avg_rating: number | null;
  flags: number;
};

export function AccountabilityPanel() {
  const { isAdmin } = useUserRole();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"hospitals" | "ambulances">("ambulances");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("holarchelp_provider_accountability" as any);
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const lower = async (table: string, id: string, current: number) => {
    const next = Math.max(0, (current ?? 0) - 10);
    const { error } = await supabase.from(table as any).update({ dispatch_priority: next } as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Priority lowered"); load();
  };
  const suspend = async (table: string, id: string) => {
    const { error } = await supabase.from(table as any).update({ status: "suspended" } as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Provider suspended"); load();
  };

  const renderTable = (kind: "hospital" | "ambulance") => {
    const filtered = rows.filter((r) => r.provider_type === kind);
    const table = kind === "hospital" ? "holarchelp_hospitals" : "holarchelp_ambulance_providers";
    return (
      <div className="rounded-2xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Accepts</TableHead>
              <TableHead>Avg Arr (min)</TableHead>
              <TableHead>Cancels</TableHead>
              <TableHead>Critical Cancels</TableHead>
              <TableHead>Stalled</TableHead>
              <TableHead>Avg Rating</TableHead>
              <TableHead><AlertTriangle className="inline h-4 w-4 text-amber-500" /> Flags</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">No providers yet.</TableCell></TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.provider_id}>
                <TableCell>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-[11px] text-muted-foreground capitalize">{r.status}</div>
                </TableCell>
                <TableCell>{r.accepts}</TableCell>
                <TableCell>{r.avg_arr_min == null ? "—" : Number(r.avg_arr_min).toFixed(1)}</TableCell>
                <TableCell>{r.cancels}</TableCell>
                <TableCell>{r.critical_cancels}</TableCell>
                <TableCell>{r.stalled}</TableCell>
                <TableCell>{r.avg_rating == null ? "—" : Number(r.avg_rating).toFixed(1)}</TableCell>
                <TableCell>{r.flags}</TableCell>
                <TableCell className="font-semibold">{r.dispatch_priority}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Link to={`/admin/holarchelp-providers/${kind}/${r.provider_id}/incidents`}>
                    <Button size="sm" variant="outline" className="gap-1"><History className="h-4 w-4" />Incidents</Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => lower(table, r.provider_id, r.dispatch_priority)}>Lower</Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => suspend(table, r.provider_id)}>Suspend</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-5 w-5" /></div>;

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
      <TabsList className="bg-primary">
        <TabsTrigger value="ambulances" className="data-[state=active]:bg-white data-[state=active]:text-foreground text-white">Ambulance</TabsTrigger>
        <TabsTrigger value="hospitals" className="data-[state=active]:bg-white data-[state=active]:text-foreground text-white">Hospitals</TabsTrigger>
      </TabsList>
      <TabsContent value="ambulances" className="mt-4">{renderTable("ambulance")}</TabsContent>
      <TabsContent value="hospitals" className="mt-4">{renderTable("hospital")}</TabsContent>
    </Tabs>
  );
}

export default function HolarcHelpAccountability() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  if (roleLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <p className="mt-4 font-semibold">Admin access required</p>
      </div>
    );
  }
  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Accountability</h1>
          <p className="text-sm text-muted-foreground">Provider performance based on objective signals.</p>
        </div>
        <Link to="/admin/users">
          <Button size="sm" variant="ghost" className="text-primary"><ArrowLeft className="mr-1 h-4 w-4" /> Admin</Button>
        </Link>
      </div>
      <AccountabilityPanel />
    </div>
  );
}
