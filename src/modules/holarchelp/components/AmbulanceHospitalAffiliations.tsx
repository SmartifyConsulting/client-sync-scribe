import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Plus, X, Hospital } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/userMessage";

type HospitalRow = { id: string; name: string; city: string | null; status: string };
type Affiliation = {
  id: string;
  hospital_id: string | null;
  hospital_name_snapshot: string | null;
  role: string | null;
  status: string;
  hospital?: HospitalRow | null;
};

export default function AmbulanceHospitalAffiliations({ providerId }: { providerId: string | null }) {
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<HospitalRow[]>([]);
  const [roleInput, setRoleInput] = useState("Primary receiving ER");
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!providerId) return;
    const { data } = await supabase
      .from("ambulance_hospital_affiliations" as any)
      .select("id, hospital_id, hospital_name_snapshot, role, status, hospital:holarchelp_hospitals(id, name, city, status)")
      .eq("ambulance_provider_id", providerId)
      .order("created_at", { ascending: false });
    setAffiliations((data as any) || []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [providerId]);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("holarchelp_hospitals_public" as any)
        .select("id, name, city, status")
        .ilike("name", `%${search}%`)
        .limit(8);
      setResults((data as any) || []);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  async function addExisting(h: HospitalRow) {
    if (!providerId) return;
    setLoading(true);
    const { error } = await supabase.from("ambulance_hospital_affiliations" as any).insert({
      ambulance_provider_id: providerId,
      hospital_id: h.id,
      hospital_name_snapshot: h.name,
      role: roleInput || null,
    });
    setLoading(false);
    if (error) return toastError(error, "We couldn't complete that. Please try again.");
    toast.success(`Added ${h.name}`);
    setSearch(""); setResults([]); load();
  }

  async function addNewInactive() {
    if (!providerId || !search.trim()) return;
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return;
    setLoading(true);
    const { data: newHosp, error: hErr } = await supabase
      .from("holarchelp_hospitals" as any)
      .insert({
        owner_id: uid,
        name: search.trim(),
        contact_email: `pending+${Date.now()}@holarchealth.com`,
        status: "pending",
      })
      .select("id, name")
      .single();
    if (hErr || !newHosp) { setLoading(false); return toast.error(hErr?.message || "Failed"); }
    const { error } = await supabase.from("ambulance_hospital_affiliations" as any).insert({
      ambulance_provider_id: providerId,
      hospital_id: (newHosp as any).id,
      hospital_name_snapshot: (newHosp as any).name,
      role: roleInput || null,
    });
    setLoading(false);
    if (error) return toastError(error, "We couldn't complete that. Please try again.");
    toast.success("Hospital submitted to admin for activation");
    setSearch(""); setResults([]); load();
  }

  async function remove(id: string) {
    await supabase.from("ambulance_hospital_affiliations" as any).delete().eq("id", id);
    load();
  }

  const hasExactMatch = results.some((r) => r.name.toLowerCase() === search.trim().toLowerCase());

  return (
    <div className="space-y-3 rounded-lg border-2 border-primary/30 p-4 bg-card">
      <div className="flex items-center gap-2">
        <Hospital className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Hospitals We Serve</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Hospitals you deliver patients to. Affiliated hospitals will see your unit as a partner. Unknown hospitals are submitted to admin for activation and won't be used for SOS dispatch until approved.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr,220px] gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Search hospital</Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. Groote Schuur" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Role</Label>
          <Input value={roleInput} onChange={(e) => setRoleInput(e.target.value)} placeholder="Primary receiving ER" />
        </div>
      </div>

      {search.trim() && (
        <div className="rounded-md border bg-background divide-y">
          {results.map((h) => (
            <button
              key={h.id}
              onClick={() => addExisting(h)}
              disabled={loading}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-accent text-sm"
            >
              <span className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span>{h.name}</span>
                {h.city && <span className="text-xs text-muted-foreground">· {h.city}</span>}
              </span>
              <Badge variant={h.status === "approved" ? "default" : "secondary"} className="text-[10px]">{h.status}</Badge>
            </button>
          ))}
          {!hasExactMatch && (
            <button
              onClick={addNewInactive}
              disabled={loading}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add "{search.trim()}" as new hospital (pending admin activation)</span>
            </button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {affiliations.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No hospital affiliations added yet.</p>
        )}
        {affiliations.map((a) => (
          <Card key={a.id} className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{a.hospital?.name || a.hospital_name_snapshot}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {a.role && <span>{a.role}</span>}
                  {a.hospital?.status && a.hospital.status !== "approved" && (
                    <Badge variant="secondary" className="text-[10px]">pending admin review</Badge>
                  )}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(a.id)} aria-label="Remove">
              <X className="h-4 w-4" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
