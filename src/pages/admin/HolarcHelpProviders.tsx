import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Hospital, Ambulance, ShieldAlert, Loader2 } from "lucide-react";

type Status = "all" | "pending" | "approved" | "rejected" | "suspended";

export default function HolarcHelpProviders() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [tab, setTab] = useState<"hospitals" | "ambulances">("hospitals");
  const [status, setStatus] = useState<Status>("pending");
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const baseH = supabase.from("holarchelp_hospitals" as any).select("*").order("created_at", { ascending: false });
    const baseA = supabase.from("holarchelp_ambulance_providers" as any).select("*").order("created_at", { ascending: false });
    const [{ data: h }, { data: a }] = await Promise.all([
      status === "all" ? baseH : baseH.eq("status", status),
      status === "all" ? baseA : baseA.eq("status", status),
    ]);
    setHospitals((h as any) ?? []);
    setAmbulances((a as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, status]);

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

  const approveHospital = async (id: string) => {
    const { error } = await supabase.rpc("holarchelp_approve_hospital" as any, { _hospital_id: id });
    if (error) return toast.error(error.message);
    toast.success("Hospital approved");
    load();
  };
  const approveAmbulance = async (id: string) => {
    const { error } = await supabase.rpc("holarchelp_approve_ambulance" as any, { _provider_id: id });
    if (error) return toast.error(error.message);
    toast.success("Ambulance provider approved");
    load();
  };
  const setStatusOn = async (table: string, id: string, newStatus: string) => {
    const patch: any = { status: newStatus };
    if (newStatus === "approved") patch.approved_at = new Date().toISOString();
    const { error } = await supabase.from(table as any).update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    load();
  };
  const setTier = async (table: string, id: string, tier: string) => {
    const { error } = await supabase.from(table as any).update({ tier } as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Tier updated");
    load();
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="text-2xl font-extrabold">HolarcHelp Providers</h1>
        <p className="text-sm text-muted-foreground">Approve, suspend, and manage hospitals and ambulance providers in the HolarcHelp network.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["pending", "approved", "suspended", "rejected", "all"] as Status[]).map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)} className="rounded-full capitalize">
            {s}
          </Button>
        ))}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="bg-primary">
          <TabsTrigger value="hospitals" className="data-[state=active]:bg-background"><Hospital className="mr-1.5 h-4 w-4" />Hospitals</TabsTrigger>
          <TabsTrigger value="ambulances" className="data-[state=active]:bg-background"><Ambulance className="mr-1.5 h-4 w-4" />Ambulance providers</TabsTrigger>
        </TabsList>

        <TabsContent value="hospitals" className="mt-4">
          {loading ? <Loader className="h-6 w-6" /> : hospitals.length === 0 ? <Empty label={`No ${status === "all" ? "" : status + " "}hospitals`} /> : (
            <div className="rounded-2xl border overflow-x-auto bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>City</TableHead>
                    <TableHead>Tier</TableHead><TableHead>Status</TableHead><TableHead>Beds</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hospitals.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{h.name}</TableCell>
                      <TableCell className="text-xs">{h.contact_email}<br /><span className="text-muted-foreground">{h.contact_phone}</span></TableCell>
                      <TableCell className="text-xs">{h.city ?? "—"}</TableCell>
                      <TableCell>
                        <Select value={h.tier} onValueChange={(v) => setTier("holarchelp_hospitals", h.id, v)}>
                          <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["tier_1","tier_2","tier_3"].map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><StatusBadge s={h.status} /></TableCell>
                      <TableCell className="text-xs">{h.beds_available}/{h.bed_capacity}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {h.status === "pending" && <Button size="sm" onClick={() => approveHospital(h.id)}>Approve</Button>}
                        {h.status === "pending" && <Button size="sm" variant="outline" onClick={() => setStatusOn("holarchelp_hospitals", h.id, "rejected")}>Reject</Button>}
                        {h.status === "approved" && <Button size="sm" variant="outline" onClick={() => setStatusOn("holarchelp_hospitals", h.id, "suspended")}>Suspend</Button>}
                        {h.status === "suspended" && <Button size="sm" onClick={() => setStatusOn("holarchelp_hospitals", h.id, "approved")}>Reactivate</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ambulances" className="mt-4">
          {loading ? <Loader className="h-6 w-6" /> : ambulances.length === 0 ? <Empty label={`No ${status === "all" ? "" : status + " "}ambulance providers`} /> : (
            <div className="rounded-2xl border overflow-x-auto bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead><TableHead>Contact</TableHead><TableHead>City</TableHead>
                    <TableHead>Tier</TableHead><TableHead>Status</TableHead><TableHead>Fleet</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ambulances.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.company_name}</TableCell>
                      <TableCell className="text-xs">{a.contact_email}<br /><span className="text-muted-foreground">{a.contact_phone}</span></TableCell>
                      <TableCell className="text-xs">{a.city ?? "—"}</TableCell>
                      <TableCell>
                        <Select value={a.tier} onValueChange={(v) => setTier("holarchelp_ambulance_providers", a.id, v)}>
                          <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["tier_1","tier_2","tier_3","tier_4"].map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><StatusBadge s={a.status} /></TableCell>
                      <TableCell className="text-xs">{a.fleet_size}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {a.status === "pending" && <Button size="sm" onClick={() => approveAmbulance(a.id)}>Approve</Button>}
                        {a.status === "pending" && <Button size="sm" variant="outline" onClick={() => setStatusOn("holarchelp_ambulance_providers", a.id, "rejected")}>Reject</Button>}
                        {a.status === "approved" && <Button size="sm" variant="outline" onClick={() => setStatusOn("holarchelp_ambulance_providers", a.id, "suspended")}>Suspend</Button>}
                        {a.status === "suspended" && <Button size="sm" onClick={() => setStatusOn("holarchelp_ambulance_providers", a.id, "approved")}>Reactivate</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const StatusBadge = ({ s }: { s: string }) => {
  const tone = s === "approved" ? "bg-emerald-500/15 text-emerald-700"
    : s === "pending" ? "bg-amber-500/15 text-amber-700"
    : s === "suspended" ? "bg-orange-500/15 text-orange-700"
    : "bg-red-500/15 text-red-700";
  return <Badge className={`${tone} border-0 capitalize`}>{s}</Badge>;
};
const Empty = ({ label }: { label: string }) => (
  <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{label}</div>
);
const Loader = ({ className }: { className?: string }) => (
  <div className="flex justify-center p-8"><Loader2 className={`animate-spin ${className ?? "h-5 w-5"}`} /></div>
);
