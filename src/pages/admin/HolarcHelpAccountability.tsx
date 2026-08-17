import { toastError } from "@/lib/userMessage";
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, ShieldAlert, AlertTriangle, ArrowLeft, History } from "lucide-react";
import { groupByCountry, sortedCountries, countryFlag } from "./_shared/grouping";

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
    if (error) toastError(error, "We couldn't complete that. Please try again.");
    setRows((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const lower = async (table: string, id: string, current: number) => {
    const next = Math.max(0, (current ?? 0) - 10);
    const { error } = await supabase.from(table as any).update({ dispatch_priority: next } as any).eq("id", id);
    if (error) return toastError(error, "We couldn't complete that. Please try again.");
    toast.success("Priority lowered"); load();
  };
  const suspend = async (table: string, id: string) => {
    const { error } = await supabase.from(table as any).update({ status: "suspended" } as any).eq("id", id);
    if (error) return toastError(error, "We couldn't complete that. Please try again.");
    toast.success("Provider suspended"); load();
  };

  const renderRowsTable = (subset: Row[], kind: "hospital" | "ambulance") => {
    const table = kind === "hospital" ? "holarchelp_hospitals" : "holarchelp_ambulance_providers";
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 text-sm uppercase tracking-wide">Provider</TableHead>
              <TableHead className="h-9 text-sm uppercase tracking-wide">Accepts</TableHead>
              <TableHead className="h-9 text-sm uppercase tracking-wide">Avg Arr (min)</TableHead>
              <TableHead className="h-9 text-sm uppercase tracking-wide">Cancels</TableHead>
              <TableHead className="h-9 text-sm uppercase tracking-wide">Critical</TableHead>
              <TableHead className="h-9 text-sm uppercase tracking-wide">Stalled</TableHead>
              <TableHead className="h-9 text-sm uppercase tracking-wide">Avg Rating</TableHead>
              <TableHead className="h-9 text-sm uppercase tracking-wide"><AlertTriangle className="inline h-3.5 w-3.5 text-amber-500" /> Flags</TableHead>
              <TableHead className="h-9 text-sm uppercase tracking-wide">Priority</TableHead>
              <TableHead className="h-9 text-right text-sm uppercase tracking-wide">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/50">
            {subset.map((r) => (
              <TableRow key={r.provider_id} className="hover:bg-muted/40">
                <TableCell className="py-2">
                  <div className="font-medium text-sm">{r.name}</div>
                  <div className="text-sm text-muted-foreground capitalize">{r.status}</div>
                </TableCell>
                <TableCell className="py-2 text-sm">{r.accepts}</TableCell>
                <TableCell className="py-2 text-sm">{r.avg_arr_min == null ? "—" : Number(r.avg_arr_min).toFixed(1)}</TableCell>
                <TableCell className="py-2 text-sm">{r.cancels}</TableCell>
                <TableCell className="py-2 text-sm">{r.critical_cancels}</TableCell>
                <TableCell className="py-2 text-sm">{r.stalled}</TableCell>
                <TableCell className="py-2 text-sm">{r.avg_rating == null ? "—" : Number(r.avg_rating).toFixed(1)}</TableCell>
                <TableCell className="py-2 text-sm">{r.flags}</TableCell>
                <TableCell className="py-2 text-sm font-semibold">{r.dispatch_priority}</TableCell>
                <TableCell className="py-2 text-right space-x-1">
                  <Link to={`/admin/holarchelp-providers/${kind}/${r.provider_id}/incidents`}>
                    <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-sm"><History className="h-3.5 w-3.5" />Incidents</Button>
                  </Link>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-sm" onClick={() => lower(table, r.provider_id, r.dispatch_priority)}>Lower</Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-sm text-destructive border-destructive/30" onClick={() => suspend(table, r.provider_id)}>Suspend</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderTable = (kind: "hospital" | "ambulance") => {
    const filtered = rows.filter((r) => r.provider_type === kind);
    if (filtered.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-border/70 bg-card p-10 text-center text-sm text-muted-foreground">
          No providers yet.
        </div>
      );
    }
    const grouped = groupByCountry(filtered, (r) => r.country);
    const countries = sortedCountries(grouped);
    return (
      <Accordion type="multiple" className="space-y-2">
        {countries.map((country) => {
          const countryRows = grouped[country];
          const approved = countryRows.filter((r) => r.status === "approved");
          const unapproved = countryRows.filter((r) => r.status !== "approved");
          return (
            <AccordionItem
              key={country}
              value={country}
              className="border border-border/70 rounded-xl bg-card overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <AccordionTrigger className="px-4 py-2.5 hover:no-underline hover:bg-muted/40">
                <div className="flex items-center gap-3">
                  <span className="text-base">{countryFlag(country)}</span>
                  <span className="text-xs font-medium text-primary-dark">{country}</span>
                  <span className="text-sm text-muted-foreground">
                    {approved.length} approved · {unapproved.length} unapproved
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-0 border-t border-border/50">
                <Accordion type="multiple" className="space-y-2 py-1">
                  {[
                    { key: "approved", label: "Approved", items: approved, dot: "bg-emerald-500" },
                    { key: "unapproved", label: "Unapproved", items: unapproved, dot: "bg-amber-500" },
                  ].map(({ key, label, items, dot }) => (
                    <AccordionItem
                      key={key}
                      value={key}
                      className="border-0 !border-b-0 rounded-lg bg-muted/30 overflow-hidden"
                    >
                      <AccordionTrigger className="px-4 py-1.5 border-0 rounded-none bg-transparent hover:no-underline hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                          <span className="text-xs font-medium text-primary-dark">{label}</span>
                          <span className="text-sm text-muted-foreground">{items.length}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-0 bg-card">
                        {items.length === 0
                          ? <div className="px-4 py-3 text-sm text-muted-foreground">None.</div>
                          : renderRowsTable(items, kind)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    );
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-5 w-5" /></div>;

  const flatTabsList = "h-auto w-full justify-start rounded-none border-b border-border bg-transparent p-0 gap-1";
  const flatTrigger =
    "relative h-9 rounded-none border-0 bg-transparent px-3 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary";

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
      <TabsList className={flatTabsList}>
        <TabsTrigger value="ambulances" className={flatTrigger}>Emergency Response</TabsTrigger>
        <TabsTrigger value="hospitals" className={flatTrigger}>Hospitals</TabsTrigger>
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
          <h1 className="text-3xl font-bold text-foreground">Accountability</h1>
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
