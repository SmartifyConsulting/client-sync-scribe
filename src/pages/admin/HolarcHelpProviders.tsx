import { toastError } from "@/lib/userMessage";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Hospital, Ambulance, ShieldAlert, Loader2, BarChart3, Plus, Pencil, Trash2, Users, Pill, Stethoscope, UserPlus, ShieldCheck } from "lucide-react";
import { InviteStaffDialog, type OrgType } from "@/modules/holarchelp/components/InviteStaffDialog";
import { useAutosave } from "@/features/admin/hooks/useAutosave";
import { AutosaveIndicator } from "@/features/admin/components/AutosaveIndicator";
import { AccountabilityPanel } from "./HolarcHelpAccountability";
import UsersTab from "@/features/admin/components/UsersTab";
import { AdminPage } from "./_shared/AdminPage";
import { AdminPanel } from "./_shared/AdminPanel";
import { adminTabsListClass, adminTabsTriggerClass } from "./_shared/AdminTabs";
import { EmptyState } from "./_shared/EmptyState";
import { RowSkeleton } from "./_shared/RowSkeleton";

type Status = "all" | "active" | "inactive";
type Kind = "hospital" | "ambulance" | "pharmacy" | "insurance";

const COUNTRY_FLAGS: Record<string, string> = {
  "South Africa": "🇿🇦", "ZA": "🇿🇦", "RSA": "🇿🇦",
  "Nigeria": "🇳🇬", "NG": "🇳🇬",
};
const COUNTRY_PINS = ["South Africa", "Nigeria"];
const TIER_ORDER = ["tier_1", "tier_2", "tier_3", "tier_4"];
const TIER_CHIP: Record<string, string> = {
  tier_1: "bg-slate-100 text-slate-700 border-slate-200",
  tier_2: "bg-orange-100 text-orange-700 border-orange-200",
  tier_3: "bg-yellow-100 text-yellow-800 border-yellow-200",
  tier_4: "bg-blue-100 text-blue-700 border-blue-200",
};

function normalizeCountry(c: string | null | undefined) {
  if (!c || !c.trim()) return "South Africa";
  const t = c.trim();
  if (/^(unknown|n\/a|none)$/i.test(t)) return "South Africa";
  if (/^(za|rsa|south africa)$/i.test(t)) return "South Africa";
  if (/^(ng|nigeria)$/i.test(t)) return "Nigeria";
  return t;
}

function groupByCountryTier(rows: any[]) {
  const out: Record<string, Record<string, any[]>> = {};
  for (const r of rows) {
    const c = normalizeCountry(r.country);
    const t = r.tier || "tier_3";
    if (!out[c]) out[c] = {};
    if (!out[c][t]) out[c][t] = [];
    out[c][t].push(r);
  }
  return out;
}

function sortedCountries(grouped: Record<string, any>) {
  const keys = Object.keys(grouped);
  const pinned = COUNTRY_PINS.filter((c) => keys.includes(c));
  const rest = keys.filter((c) => !pinned.includes(c)).sort();
  return [...pinned, ...rest];
}

const isActive = (s: string) => s === "approved";
const tableFor = (k: Kind) =>
  k === "hospital" ? "holarchelp_hospitals"
  : k === "ambulance" ? "holarchelp_ambulance_providers"
  : k === "insurance" ? "holarchelp_insurance_providers"
  : "holarchelp_pharmacies";
const nameField = (k: Kind) => (k === "ambulance" || k === "insurance") ? "company_name" : "name";
const nounFor = (k: Kind) =>
  k === "hospital" ? "hospitals"
  : k === "ambulance" ? "ambulances"
  : k === "insurance" ? "insurers"
  : "pharmacies";

type EditState = { kind: Kind; row: any | null } | null;

export default function HolarcHelpProviders() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [tab, setTab] = useState<Kind>("hospital");
  const [status, setStatus] = useState<Status>("all");
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [insurers, setInsurers] = useState<any[]>([]);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditState>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: Kind; id: string; name: string } | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [invite, setInvite] = useState<{ orgType: OrgType; id: string; name: string } | null>(null);
  const [providerSearch, setProviderSearch] = useState<Record<Kind, string>>({ hospital: "", ambulance: "", pharmacy: "", insurance: "" });

  const filterByStatus = (rows: any[]) =>
    status === "all" ? rows : status === "active" ? rows.filter((r) => isActive(r.status)) : rows.filter((r) => !isActive(r.status));

  const load = async () => {
    setLoading(true);
    const [{ data: h }, { data: a }, { data: p }, { data: i }] = await Promise.all([
      supabase.from("holarchelp_hospitals" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("holarchelp_ambulance_providers" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("holarchelp_pharmacies" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("holarchelp_insurance_providers" as any).select("*").order("created_at", { ascending: false }),
    ]);
    const hRows = filterByStatus((h as any) ?? []);
    const aRows = filterByStatus((a as any) ?? []);
    const pRows = filterByStatus((p as any) ?? []);
    const iRows = filterByStatus((i as any) ?? []);
    setHospitals(hRows);
    setAmbulances(aRows);
    setPharmacies(pRows);
    setInsurers(iRows);
    setLoading(false);

    const userIds = Array.from(new Set(
      [...hRows, ...aRows, ...pRows, ...iRows].map((r: any) => r.owner_id ?? r.user_id).filter(Boolean),
    )) as string[];
    if (userIds.length) {
      const { data: emailRes } = await supabase.functions.invoke("admin-get-user-emails", { body: { user_ids: userIds } });
      if ((emailRes as any)?.emails) setUserEmails((emailRes as any).emails);
    }
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

  const setActiveFlag = async (kind: Kind, id: string, active: boolean) => {
    const patch: any = { status: active ? "approved" : "suspended" };
    if (active) patch.approved_at = new Date().toISOString();
    const { error } = await supabase.from(tableFor(kind) as any).update(patch).eq("id", id);
    if (error) return toastError(error, "We couldn't complete that. Please try again.");
    toast.success(active ? "Activated" : "Deactivated"); load();
  };
  const setTier = async (kind: Kind, id: string, tier: string) => {
    const { error } = await supabase.from(tableFor(kind) as any).update({ tier } as any).eq("id", id);
    if (error) return toastError(error, "We couldn't complete that. Please try again.");
    toast.success("Tier updated"); load();
  };
  const removeRow = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from(tableFor(confirmDelete.kind) as any).delete().eq("id", confirmDelete.id);
    if (error) return toastError(error, "We couldn't complete that. Please try again.");
    toast.success("Deleted"); setConfirmDelete(null); load();
  };


  const renderRow = (kind: Kind, r: any) => {
    const active = isActive(r.status);
    const userEmail = userEmails[r.owner_id ?? r.user_id] ?? null;
    return (
      <TableRow key={r.id}>
        <TableCell className="font-medium">{r[nameField(kind)]}</TableCell>
        <TableCell className="text-xs">
          {userEmail
            ? <><span className="font-semibold">{userEmail}</span>
                {r.contact_email && r.contact_email.toLowerCase() !== userEmail.toLowerCase() && (
                  <><br /><span className="text-muted-foreground">Org: {r.contact_email}</span></>
                )}
              </>
            : <span>{r.contact_email ?? "—"}</span>}
          {r.contact_phone && <><br /><span className="text-muted-foreground">{r.contact_phone}</span></>}
        </TableCell>
        <TableCell className="text-xs">{r.city ?? "—"}</TableCell>
        <TableCell>
          {kind === "insurance" ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            <Select value={r.tier ?? "tier_3"} onValueChange={(v) => setTier(kind, r.id, v)}>
              <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(kind === "hospital" ? ["tier_1","tier_2","tier_3"] : ["tier_1","tier_2","tier_3","tier_4"]).map((t) =>
                  <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={(v) => setActiveFlag(kind, r.id, v)} />
            <span className={`text-sm font-semibold ${active ? "text-emerald-700" : "text-muted-foreground"}`}>
              {active ? "Active" : "Inactive"}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-right space-x-1">
          {(kind === "hospital" || kind === "ambulance") && (
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Invite staff"
              onClick={() => setInvite({ orgType: kind as OrgType, id: r.id, name: r[nameField(kind)] })}>
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEdit({ kind, row: r })}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setConfirmDelete({ kind, id: r.id, name: r[nameField(kind)] })}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  const headers = ["Name", "Contact", "City", "Tier", "Status", "Actions"];

  const renderGroupedTable = (rows: any[], kind: Kind) => {
    const noun = nounFor(kind);
    if (rows.length === 0) return <Empty label={`No ${status === "all" ? "" : status + " "}${noun}`} />;
    const grouped = groupByCountryTier(rows);
    const countries = sortedCountries(grouped);
    return (
      <Accordion type="multiple" className="space-y-2">
        {countries.map((country) => {
          const tiers = grouped[country];
          const total = Object.values(tiers).reduce((s, arr) => s + arr.length, 0);
          const flag = COUNTRY_FLAGS[country] ?? "🌍";
          return (
            <AccordionItem key={country} value={country} className="border rounded-2xl bg-card overflow-hidden border-primary/30">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{flag}</span>
                  <span className="font-bold">{country}</span>
                  <span className="text-xs text-muted-foreground">{total} {noun}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3">
                <Accordion type="multiple" className="space-y-2 py-1">
                  {TIER_ORDER.filter((t) => tiers[t]?.length).map((t) => (
                    <AccordionItem
                      key={t}
                      value={t}
                      className="border-0 !border-b-0 rounded-lg bg-muted/30 overflow-hidden"
                    >
                      <AccordionTrigger className="px-4 py-1.5 border-0 rounded-none bg-transparent hover:no-underline hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-sm font-semibold border ${TIER_CHIP[t]}`}>
                            {t.replace("_", " ").replace("tier", "Tier")}
                          </span>
                          <span className="text-xs text-muted-foreground">{tiers[t].length} {noun}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-0 bg-card">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {headers.map((h) => (
                                  <TableHead key={h} className={h === "Actions" ? "text-right" : ""}>{h}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>{tiers[t].map((r: any) => renderRow(kind, r))}</TableBody>
                          </Table>
                        </div>
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

  // Premium underline tab styling shared across this page
  const topTrigger =
    "relative h-9 rounded-none border-0 bg-transparent px-3 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary";
  const subTrigger = topTrigger;
  const flatTabsList = "h-auto w-full justify-start rounded-none border-b border-border bg-transparent p-0 gap-1";

  const providerKindNeedsAdd = (k: string) => k === "hospital" || k === "ambulance" || k === "pharmacy";

  const renderProviderPanel = (k: Kind) => {
    const fullList =
      k === "hospital" ? hospitals
      : k === "ambulance" ? ambulances
      : k === "insurance" ? insurers
      : pharmacies;
    const noun = nounFor(k);
    const q = providerSearch[k].trim().toLowerCase();
    const list = q
      ? fullList.filter((r: any) => {
          const ownerEmail = (userEmails[r.owner_id ?? r.user_id] ?? "").toLowerCase();
          return [r[nameField(k)], r.city, r.contact_email, r.contact_phone, ownerEmail]
            .filter(Boolean)
            .some((v: any) => String(v).toLowerCase().includes(q));
        })
      : fullList;
    return (
      <AdminPanel
        title={`${list.length} ${noun}${q ? ` matching "${providerSearch[k]}"` : ""}`}
        description="Grouped by country, then tier."
        bodyClassName="p-0"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={providerSearch[k]}
                onChange={(e) => setProviderSearch((prev) => ({ ...prev, [k]: e.target.value }))}
                placeholder={`Search ${noun}…`}
                className="h-8 w-48 pl-7 text-sm"
              />
            </div>
            <div className="inline-flex rounded-md border border-[hsl(var(--admin-border-strong))] bg-[hsl(var(--admin-surface))] p-0.5">
              {(["active", "inactive", "all"] as Status[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-2.5 py-1 text-sm font-medium capitalize rounded-sm transition-colors ${
                    status === s
                      ? "bg-[hsl(var(--admin-accent))] text-white"
                      : "text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text-primary))]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {providerKindNeedsAdd(k) && (
              <Button size="sm" className="h-8 px-3 text-sm" onClick={() => { setTab(k); setChooserOpen(true); }}>
                <Plus className="mr-1 h-3.5 w-3.5" />Add
              </Button>
            )}
          </div>
        }
      >
        {loading ? (
          <RowSkeleton rows={6} cols={6} />
        ) : list.length === 0 ? (
          <EmptyState title={q ? `No ${noun} match "${providerSearch[k]}"` : `No ${status === "all" ? "" : status + " "}${noun}`} />
        ) : (
          <div className="p-3">{renderGroupedTable(list, k)}</div>
        )}
      </AdminPanel>
    );
  };


  return (
    <AdminPage
      eyebrow="Admin"
      title="User Management"
      description="Manage users and accountability."
    >
      <Tabs defaultValue="users">
        <TabsList className={adminTabsListClass}>
          <TabsTrigger value="users" className={`${adminTabsTriggerClass} gap-1.5`}>
            <Users className="h-3.5 w-3.5" />Users
          </TabsTrigger>
          <TabsTrigger value="accountability" className={`${adminTabsTriggerClass} gap-1.5`}>
            <BarChart3 className="h-3.5 w-3.5" />Accountability
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4 space-y-3">
          <Tabs defaultValue="patients" value={undefined}>
            <TabsList className={adminTabsListClass}>
              <TabsTrigger value="patients" className={`${adminTabsTriggerClass} gap-1.5`}>
                <Users className="h-3.5 w-3.5" />Patients
              </TabsTrigger>
              <TabsTrigger value="providers" className={`${adminTabsTriggerClass} gap-1.5`}>
                <Stethoscope className="h-3.5 w-3.5" />Healthcare Providers
              </TabsTrigger>
              <TabsTrigger value="hospital" className={`${adminTabsTriggerClass} gap-1.5`}>
                <Hospital className="h-3.5 w-3.5" />Hospitals
              </TabsTrigger>
              <TabsTrigger value="emergency-users" className={`${adminTabsTriggerClass} gap-1.5`}>
                <Ambulance className="h-3.5 w-3.5" />ER Providers
              </TabsTrigger>
              <TabsTrigger value="pharmacy" className={`${adminTabsTriggerClass} gap-1.5`}>
                <Pill className="h-3.5 w-3.5" />Pharmacies
              </TabsTrigger>
              <TabsTrigger value="insurance" className={`${adminTabsTriggerClass} gap-1.5`}>
                <ShieldCheck className="h-3.5 w-3.5" />Insurers
              </TabsTrigger>
              <TabsTrigger value="admin" className={`${adminTabsTriggerClass} gap-1.5`}>
                <ShieldAlert className="h-3.5 w-3.5" />Admin
              </TabsTrigger>
            </TabsList>

            <TabsContent value="patients" className="mt-4">
              <UsersTab kind="patient" />
            </TabsContent>
            <TabsContent value="providers" className="mt-4">
              <UsersTab kind="doctor" />
            </TabsContent>
            <TabsContent value="emergency-users" className="mt-4 space-y-6">
              <UsersTab kind="emergency" />
              {renderProviderPanel("ambulance")}
            </TabsContent>
            <TabsContent value="admin" className="mt-4">
              <UsersTab kind="admin" />
            </TabsContent>

            {(["hospital", "pharmacy", "insurance"] as Kind[]).map((k) => (
              <TabsContent key={k} value={k} className="mt-4">
                {renderProviderPanel(k)}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        <TabsContent value="accountability" className="mt-4">
          <AccountabilityPanel />
        </TabsContent>

      </Tabs>

      <ProviderDialog
        state={edit}
        onClose={() => setEdit(null)}
        onSaved={() => { setEdit(null); load(); }}
      />

      <Dialog open={chooserOpen} onOpenChange={setChooserOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Add provider</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-2">
            <Button variant="outline" className="h-20 flex-col gap-1" onClick={() => { setChooserOpen(false); setTab("hospital"); setEdit({ kind: "hospital", row: null }); }}>
              <Hospital className="h-6 w-6" />
              <span className="text-xs font-semibold">Hospital</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-1" onClick={() => { setChooserOpen(false); setTab("ambulance"); setEdit({ kind: "ambulance", row: null }); }}>
              <Ambulance className="h-6 w-6" />
              <span className="text-xs font-semibold">Emergency Response</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-1" onClick={() => { setChooserOpen(false); setTab("pharmacy"); setEdit({ kind: "pharmacy", row: null }); }}>
              <Pill className="h-6 w-6" />
              <span className="text-xs font-semibold">Pharmacy</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete provider?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.name} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={removeRow} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {invite && (
        <InviteStaffDialog
          open={!!invite}
          onOpenChange={(o) => !o && setInvite(null)}
          orgType={invite.orgType}
          orgId={invite.id}
          orgName={invite.name}
        />
      )}
    </AdminPage>
  );
}

function ProviderDialog({ state, onClose, onSaved }: { state: EditState; onClose: () => void; onSaved: () => void }) {
  const open = !!state;
  const kind = state?.kind ?? "hospital";
  const row = state?.row ?? null;
  const isEdit = !!row;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (!state) return;
    setForm(row ?? {
      [nameField(kind)]: "",
      contact_email: "",
      contact_phone: "",
      city: "",
      country: "South Africa",
      tier: "tier_3",
      accepting_patients: true,
    });
  }, [state]);

  const update = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const buildPayload = () => ({
    [nameField(kind)]: form[nameField(kind)],
    contact_email: form.contact_email || null,
    contact_phone: form.contact_phone || null,
    city: form.city || null,
    country: form.country || null,
    tier: form.tier || "tier_3",
    latitude: form.latitude ?? null,
    longitude: form.longitude ?? null,
  });

  // Autosave when editing an existing row (debounced).
  const autosave = useAutosave(
    form,
    async () => {
      if (!isEdit || !row?.id || !form[nameField(kind)]) return;
      const { error } = await supabase.from(tableFor(kind) as any).update(buildPayload()).eq("id", row.id);
      if (error) throw error;
    },
    { enabled: isEdit, delay: 500 },
  );

  const create = async () => {
    setSaving(true);
    try {
      const payload: any = buildPayload();
      payload.status = "approved";
      payload.approved_at = new Date().toISOString();
      const { data: u } = await supabase.auth.getUser();
      if (u?.user?.id) payload.owner_id = u.user.id;
      const { error } = await supabase.from(tableFor(kind) as any).insert(payload);
      if (error) throw error;
      toast.success("Created");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit" : "Add"} {kind === "hospital" ? "Hospital" : kind === "ambulance" ? "Emergency Response Provider" : "Pharmacy"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{kind === "ambulance" ? "Company name" : kind === "pharmacy" ? "Pharmacy name" : "Hospital name"}</Label>
            <Input
              value={form[nameField(kind)] ?? ""}
              onChange={(e) => update(nameField(kind), e.target.value)}
              placeholder={kind === "hospital" ? "e.g. Netcare Milpark Hospital" : kind === "ambulance" ? "e.g. ER24" : "e.g. Clicks Pharmacy Sandton"}
              autoFocus
            />
          </div>
          <LocationPicker
            initialQuery={form[nameField(kind)] ?? ""}
            onPick={(d) => setForm((f: any) => ({
              ...f,
              city: d.city || f.city,
              country: d.country || f.country,
              contact_phone: d.phone || f.contact_phone,
              latitude: d.lat,
              longitude: d.lng,
              address: d.formatted_address ?? f.address,
            }))}
          />
          {form.latitude != null && form.longitude != null && (
            <p className="text-sm text-muted-foreground">
              Pinned at {Number(form.latitude).toFixed(4)}, {Number(form.longitude).toFixed(4)}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.contact_email ?? ""} onChange={(e) => update("contact_email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.contact_phone ?? ""} onChange={(e) => update("contact_phone", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city ?? ""} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input value={form.country ?? ""} onChange={(e) => update("country", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tier</Label>
            <Select value={form.tier ?? "tier_3"} onValueChange={(v) => update("tier", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(kind === "hospital" ? ["tier_1","tier_2","tier_3"] : ["tier_1","tier_2","tier_3","tier_4"]).map((t) =>
                  <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            Note: providers control their own "accepting patients" status from their provider view.
          </p>
        </div>
        <DialogFooter className="items-center sm:justify-between gap-2">
          {isEdit ? (
            <>
              <AutosaveIndicator status={autosave.status} error={autosave.error} />
              <Button variant="outline" onClick={() => { onSaved(); }}>Close</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={create} disabled={saving || !form[nameField(kind)]}>
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const Empty = ({ label }: { label: string }) => (
  <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{label}</div>
);
const Loader = () => (
  <div className="flex justify-center p-8"><Loader2 className="animate-spin h-5 w-5" /></div>
);

type PlaceDetails = {
  name?: string | null; formatted_address?: string | null;
  lat?: number | null; lng?: number | null;
  city?: string | null; country?: string | null;
  phone?: string | null; website?: string | null;
};

function LocationPicker({ onPick, initialQuery }: { onPick: (d: PlaceDetails) => void; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery ?? "");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ description: string; place_id: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const search = async (input: string) => {
    if (input.trim().length < 3) { setItems([]); return; }
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-places-autocomplete", { body: { input, types: "any" } });
      if (error) {
        console.error("Places autocomplete invoke error:", error);
        toast.error("Location search failed — check API settings");
        setItems([]);
        return;
      }
      if (data?.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        console.error("Google Places status:", data.status, data.error_message);
        toast.error(`Google Places: ${data.status}`);
      }
      const preds = (data?.predictions ?? []).map((p: any) => ({ description: p.description, place_id: p.place_id }));
      setItems(preds);
      setOpen(true);
    } catch (e: any) {
      console.error("Places autocomplete failed:", e);
      toast.error(e?.message ?? "Location search failed");
    } finally { setSearching(false); }
  };

  const onChange = (v: string) => {
    setQ(v);
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => search(v), 350);
  };

  const pick = async (place_id: string, label: string) => {
    setPicking(place_id);
    try {
      const { data, error } = await supabase.functions.invoke("google-place-details", { body: { place_id } });
      if (error) throw error;
      onPick(data as PlaceDetails);
      setQ(data?.formatted_address || label);
      setOpen(false);
      toast.success("Location pinned — fields auto-filled");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load place details");
    } finally { setPicking(null); }
  };

  return (
    <div className="space-y-1.5" ref={boxRef}>
      <Label>Search address {initialQuery ? `for "${initialQuery}"` : ""}</Label>
      <div className="relative">
        <Input
          value={q}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type the provider name or address…"
          onFocus={() => items.length > 0 && setOpen(true)}
        />
        {searching && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
        {open && items.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-y-auto">
            {items.map((s) => (
              <button
                key={s.place_id}
                type="button"
                onClick={() => pick(s.place_id, s.description)}
                disabled={picking === s.place_id}
                className="block w-full text-left px-3 py-2 text-xs hover:bg-muted disabled:opacity-50"
              >
                {picking === s.place_id ? <Loader2 className="inline mr-2 h-4 w-4 animate-spin" /> : null}
                {s.description}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">Selecting a result auto-fills city, country, phone, and pins the location on the map.</p>
    </div>
  );
}
