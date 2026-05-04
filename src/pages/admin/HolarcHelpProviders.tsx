import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Hospital, Ambulance, ShieldAlert, Loader2, Download, Upload, BarChart3, Mic2, Building2 } from "lucide-react";
import { AccountabilityPanel } from "./HolarcHelpAccountability";

type Status = "all" | "pending" | "approved" | "rejected" | "suspended";

const COUNTRY_FLAGS: Record<string, string> = {
  "South Africa": "🇿🇦", "ZA": "🇿🇦", "RSA": "🇿🇦",
  "Nigeria": "🇳🇬", "NG": "🇳🇬",
};
const COUNTRY_PINS = ["South Africa", "Nigeria"];
const TIER_ORDER = ["tier_1", "tier_2", "tier_3", "tier_4"];
const TIER_CHIP: Record<string, string> = {
  tier_1: "bg-pink-100 text-pink-700 border-pink-200",
  tier_2: "bg-orange-100 text-orange-700 border-orange-200",
  tier_3: "bg-yellow-100 text-yellow-800 border-yellow-200",
  tier_4: "bg-blue-100 text-blue-700 border-blue-200",
};

function normalizeCountry(c: string | null | undefined) {
  if (!c) return "Unknown";
  const t = c.trim();
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

export default function HolarcHelpProviders() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [tab, setTab] = useState<"hospitals" | "ambulances">("hospitals");
  const [status, setStatus] = useState<Status>("all");
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  // Voice clip state
  const [voiceClipPath, setVoiceClipPath] = useState<string | null>(null);
  const [clipFile, setClipFile] = useState<File | null>(null);
  const [uploadingClip, setUploadingClip] = useState(false);

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

  const loadVoiceClip = async () => {
    const { data } = await supabase
      .from("holarchelp_voice_clip_settings" as any)
      .select("default_clip_path")
      .eq("id", 1)
      .maybeSingle();
    setVoiceClipPath((data as any)?.default_clip_path ?? null);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, status]);
  useEffect(() => { if (isAdmin) loadVoiceClip(); }, [isAdmin]);

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
    toast.success("Hospital approved"); load();
  };
  const approveAmbulance = async (id: string) => {
    const { error } = await supabase.rpc("holarchelp_approve_ambulance" as any, { _provider_id: id });
    if (error) return toast.error(error.message);
    toast.success("Ambulance provider approved"); load();
  };
  const setStatusOn = async (table: string, id: string, newStatus: string) => {
    const patch: any = { status: newStatus };
    if (newStatus === "approved") patch.approved_at = new Date().toISOString();
    const { error } = await supabase.from(table as any).update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated"); load();
  };
  const setTier = async (table: string, id: string, tier: string) => {
    const { error } = await supabase.from(table as any).update({ tier } as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Tier updated"); load();
  };

  const uploadClip = async () => {
    if (!clipFile) return toast.error("Choose an MP3 first");
    setUploadingClip(true);
    const path = `default/${Date.now()}-${clipFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("guardian-voice-clips").upload(path, clipFile, {
      contentType: clipFile.type || "audio/mpeg", upsert: false,
    });
    if (upErr) { setUploadingClip(false); return toast.error(upErr.message); }
    const { error: dbErr } = await supabase.from("holarchelp_voice_clip_settings" as any)
      .upsert({ id: 1, default_clip_path: path, updated_at: new Date().toISOString() } as any, { onConflict: "id" });
    setUploadingClip(false);
    if (dbErr) return toast.error(dbErr.message);
    toast.success("SOS voice clip set");
    setClipFile(null);
    loadVoiceClip();
  };

  const renderHospitalRow = (h: any) => (
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
  );

  const renderAmbulanceRow = (a: any) => (
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
  );

  const renderGroupedTable = (
    rows: any[],
    kind: "hospital" | "ambulance",
    headers: string[],
    rowFn: (r: any) => JSX.Element,
  ) => {
    if (rows.length === 0) return <Empty label={`No ${status === "all" ? "" : status + " "}${kind === "hospital" ? "hospitals" : "ambulances"}`} />;
    const grouped = groupByCountryTier(rows);
    const countries = sortedCountries(grouped);
    const noun = kind === "hospital" ? "hospitals" : "ambulances";
    return (
      <Accordion type="multiple" defaultValue={countries.slice(0, 2)} className="space-y-2">
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
                <Accordion type="multiple" className="space-y-2">
                  {TIER_ORDER.filter((t) => tiers[t]?.length).map((t) => (
                    <AccordionItem key={t} value={t} className="border rounded-xl overflow-hidden">
                      <AccordionTrigger className="px-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${TIER_CHIP[t]}`}>
                            {t.replace("_", " ").replace("tier", "Tier")}
                          </span>
                          <span className="text-xs text-muted-foreground">{tiers[t].length} {noun}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {headers.map((h) => (
                                  <TableHead key={h} className={h === "Actions" ? "text-right" : ""}>{h}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>{tiers[t].map(rowFn)}</TableBody>
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

  const seedTestProviders = async () => {
    try {
      const { data, error } = await (await import("@/integrations/supabase/client")).supabase.functions.invoke("seed-test-providers");
      if (error) throw error;
      const { toast } = await import("sonner");
      toast.success("Test providers seeded");
      console.log("seed-test-providers result", data);
    } catch (e: any) {
      const { toast } = await import("sonner");
      toast.error(e?.message ?? "Seeding failed");
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Admin</p>
          <h1 className="text-2xl font-extrabold">HolarcHelp Admin</h1>
          <p className="text-sm text-muted-foreground">Manage providers, accountability, and the SOS voice clip.</p>
        </div>
        <button onClick={seedTestProviders} className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">
          Seed test providers
        </button>
      </div>

      <Tabs defaultValue="providers">
        <TabsList className="bg-primary w-full sm:w-auto">
          <TabsTrigger value="providers" className="data-[state=active]:bg-white data-[state=active]:text-foreground text-white gap-1.5">
            <Building2 className="h-4 w-4" />Providers
          </TabsTrigger>
          <TabsTrigger value="accountability" className="data-[state=active]:bg-white data-[state=active]:text-foreground text-white gap-1.5">
            <BarChart3 className="h-4 w-4" />Accountability
          </TabsTrigger>
          <TabsTrigger value="voice-clip" className="data-[state=active]:bg-white data-[state=active]:text-foreground text-white gap-1.5">
            <Mic2 className="h-4 w-4" />SOS Voice Clip
          </TabsTrigger>
        </TabsList>

        {/* Providers tab */}
        <TabsContent value="providers" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {(["pending", "approved", "suspended", "rejected", "all"] as Status[]).map((s) => (
                <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)} className="rounded-full capitalize">
                  {s}
                </Button>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={importing}
              onClick={async () => {
                setImporting(true);
                const { data, error } = await supabase.functions.invoke("import-guardian-providers", { body: {} });
                setImporting(false);
                if (error) return toast.error(error.message);
                toast.success(`Imported ${data?.hospitals_imported ?? 0} hospitals, ${data?.ambulances_imported ?? 0} ambulances`);
                load();
              }}
            >
              {importing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
              Import from Holarc Guardian
            </Button>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="bg-primary">
              <TabsTrigger value="hospitals" className="data-[state=active]:bg-white data-[state=active]:text-foreground text-white">
                <Hospital className="mr-1.5 h-4 w-4" />Hospitals
              </TabsTrigger>
              <TabsTrigger value="ambulances" className="data-[state=active]:bg-white data-[state=active]:text-foreground text-white">
                <Ambulance className="mr-1.5 h-4 w-4" />Ambulance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hospitals" className="mt-4">
              {loading ? <Loader />
                : renderGroupedTable(
                    hospitals,
                    "hospital",
                    ["Name", "Contact", "City", "Tier", "Status", "Beds", "Actions"],
                    renderHospitalRow,
                  )}
            </TabsContent>

            <TabsContent value="ambulances" className="mt-4">
              {loading ? <Loader />
                : renderGroupedTable(
                    ambulances,
                    "ambulance",
                    ["Company", "Contact", "City", "Tier", "Status", "Fleet", "Actions"],
                    renderAmbulanceRow,
                  )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Accountability tab */}
        <TabsContent value="accountability" className="mt-4">
          <AccountabilityPanel />
        </TabsContent>

        {/* SOS voice clip tab */}
        <TabsContent value="voice-clip" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">SOS voice clip</CardTitle>
              <CardDescription>The MP3 played to emergency contacts when an SOS call connects.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border p-3 bg-muted/30">
                <p className="text-xs font-semibold">Current default clip</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {voiceClipPath ? voiceClipPath : "None — calls will use a fallback text-to-speech message."}
                </p>
              </div>
              <div className="rounded-xl border p-3 space-y-2">
                <p className="text-xs font-semibold">Upload new MP3</p>
                <input
                  type="file"
                  accept="audio/mpeg,.mp3"
                  onChange={(e) => setClipFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-muted file:text-foreground"
                />
                <Button onClick={uploadClip} disabled={!clipFile || uploadingClip} className="w-full sm:w-auto">
                  {uploadingClip ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                  Upload &amp; set as default
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Tip: keep clips under ~30 seconds. Africa's Talking sandbox only delivers to numbers registered in their Simulator.
                </p>
              </div>
            </CardContent>
          </Card>
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
const Loader = () => (
  <div className="flex justify-center p-8"><Loader2 className="animate-spin h-5 w-5" /></div>
);
