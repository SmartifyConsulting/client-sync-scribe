import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, X, Hospital } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/userMessage";

type Hospital = { id: string; name: string; city: string | null; status: string };
type Affiliation = {
  id: string;
  hospital_id: string | null;
  hospital_name_snapshot: string | null;
  role_at_hospital: string | null;
  status: string;
  hospital?: Hospital | null;
};

export default function HospitalAffiliations() {
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Hospital[]>([]);
  const [roleInput, setRoleInput] = useState("Visiting");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  async function load() {
    if (!userId) return;
    const { data } = await supabase
      .from("doctor_hospital_affiliations")
      .select("id, hospital_id, hospital_name_snapshot, role_at_hospital, status, hospital:holarchelp_hospitals(id, name, city, status)")
      .eq("doctor_id", userId)
      .order("created_at", { ascending: false });
    setAffiliations((data as any) || []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  // Preload all approved hospitals so the doctor can browse the registered list
  // even before typing anything.
  const [allHospitals, setAllHospitals] = useState<Hospital[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("holarchelp_hospitals_public" as any)
        .select("id, name, city, status")
        .order("name", { ascending: true })
        .limit(500);
      setAllHospitals((data as any) || []);
    })();
  }, []);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setResults(allHospitals);
      return;
    }
    setResults(allHospitals.filter((h) => h.name.toLowerCase().includes(q)).slice(0, 20));
  }, [search, allHospitals]);

  async function addExisting(h: Hospital) {
    if (!userId) return;
    setLoading(true);
    const { error } = await supabase.from("doctor_hospital_affiliations").insert({
      doctor_id: userId,
      hospital_id: h.id,
      hospital_name_snapshot: h.name,
      role_at_hospital: roleInput || null,
    });
    setLoading(false);
    if (error) return toastError(error, "We couldn't complete that. Please try again.");
    toast.success(`Added ${h.name}`);
    setSearch(""); setResults([]); load();
  }

  async function addNewInactive() {
    if (!userId || !search.trim()) return;
    setLoading(true);
    const { data: newHosp, error: hErr } = await supabase
      .from("holarchelp_hospitals")
      .insert({
        owner_id: userId,
        name: search.trim(),
        contact_email: `pending+${Date.now()}@holarchealth.com`,
        status: "pending",
      })
      .select("id, name")
      .single();
    if (hErr || !newHosp) { setLoading(false); return toast.error(hErr?.message || "Failed"); }
    const { error } = await supabase.from("doctor_hospital_affiliations").insert({
      doctor_id: userId,
      hospital_id: newHosp.id,
      hospital_name_snapshot: newHosp.name,
      role_at_hospital: roleInput || null,
    });
    setLoading(false);
    if (error) return toastError(error, "We couldn't complete that. Please try again.");
    toast.success("Hospital submitted to admin for activation");
    setSearch(""); setResults([]); load();
  }

  async function remove(id: string) {
    await supabase.from("doctor_hospital_affiliations").delete().eq("id", id);
    load();
  }

  const hasExactMatch = results.some((r) => r.name.toLowerCase() === search.trim().toLowerCase());

  return (
    <div className="space-y-3 rounded-lg border-2 border-primary/30 p-4">
      <div className="flex items-center gap-2">
        <Hospital className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Hospital Affiliations</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Add hospitals you serve at. Listed hospitals will see you in their staff directory. Unknown hospitals are submitted to admin for activation.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr,180px] gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Search or pick a registered hospital</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Start typing or browse the list below…"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Your role</Label>
          <Input value={roleInput} onChange={(e) => setRoleInput(e.target.value)} placeholder="Visiting" />
        </div>
      </div>

      <div className="rounded-md border bg-card divide-y max-h-64 overflow-auto">
        {results.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {allHospitals.length === 0 ? "Loading hospitals…" : "No matching hospitals."}
          </div>
        )}
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
            <Badge variant={h.status === "approved" ? "default" : "secondary"} className="text-xs">{h.status}</Badge>
          </button>
        ))}
        {search.trim() && !hasExactMatch && (
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
                  {a.role_at_hospital && <span>{a.role_at_hospital}</span>}
                  {a.hospital?.status && a.hospital.status !== "approved" && (
                    <Badge variant="secondary" className="text-xs">pending admin review</Badge>
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
