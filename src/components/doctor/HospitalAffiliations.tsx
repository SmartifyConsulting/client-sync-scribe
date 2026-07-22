import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Building2, Plus, X, Hospital, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/userMessage";

const ROLE_OPTIONS = [
  "Permanent",
  "Part-time",
  "Locum",
  "Sessional",
  "Visiting",
  "Independent",
  "Agency",
  "Honorary",
  "Volunteer",
  "Academic",
];

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
  const [roleInput, setRoleInput] = useState("Visiting");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hospitalsLoaded, setHospitalsLoaded] = useState(false);

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

  // Only fetch the approved hospital list once the dropdown is actually
  // opened, rather than preloading it before the user has activated it.
  const [allHospitals, setAllHospitals] = useState<Hospital[]>([]);
  async function loadHospitalsIfNeeded() {
    if (hospitalsLoaded) return;
    const { data } = await supabase
      .from("holarchelp_hospitals_public" as any)
      .select("id, name, city, status")
      .eq("status", "approved")
      .order("name", { ascending: true })
      .limit(500);
    setAllHospitals((data as any) || []);
    setHospitalsLoaded(true);
  }

  const results = (() => {
    const q = search.trim().toLowerCase();
    if (!q) return allHospitals;
    return allHospitals.filter((h) => h.name.toLowerCase().includes(q)).slice(0, 50);
  })();

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function addSelected() {
    if (!userId || selectedIds.size === 0) return;
    setLoading(true);
    const chosen = allHospitals.filter((h) => selectedIds.has(h.id));
    const { error } = await supabase.from("doctor_hospital_affiliations").insert(
      chosen.map((h) => ({
        doctor_id: userId,
        hospital_id: h.id,
        hospital_name_snapshot: h.name,
        role_at_hospital: roleInput || null,
      })),
    );
    setLoading(false);
    if (error) return toastError(error, "We couldn't complete that. Please try again.");
    toast.success(`Added ${chosen.length} hospital${chosen.length > 1 ? "s" : ""}`);
    setSelectedIds(new Set());
    setSearch("");
    setOpen(false);
    load();
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
    setSearch(""); setOpen(false); load();
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
          <Label className="text-xs">Select hospitals</Label>
          <Popover
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (next) loadHospitalsIfNeeded();
            }}
          >
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                {selectedIds.size > 0 ? `${selectedIds.size} hospital${selectedIds.size > 1 ? "s" : ""} selected` : "Select approved hospitals…"}
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command shouldFilter={false} className="h-auto">
                <CommandInput
                  placeholder="Search hospitals…"
                  value={search}
                  onValueChange={setSearch}
                />
                <CommandList className="max-h-64">
                  <CommandEmpty>
                    {!hospitalsLoaded ? "Loading hospitals…" : "No matching hospitals."}
                  </CommandEmpty>
                  <CommandGroup>
                    {results.map((h) => (
                      <CommandItem key={h.id} onSelect={() => toggleSelected(h.id)} className="gap-2">
                        <Checkbox checked={selectedIds.has(h.id)} className="pointer-events-none" />
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        <span className="flex-1">{h.name}</span>
                        {h.city && <span className="text-xs text-muted-foreground">{h.city}</span>}
                      </CommandItem>
                    ))}
                    {search.trim() && !hasExactMatch && (
                      <CommandItem onSelect={addNewInactive} className="gap-2 text-primary">
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add "{search.trim()}" as new hospital (pending admin activation)</span>
                      </CommandItem>
                    )}
                  </CommandGroup>
                </CommandList>
                {selectedIds.size > 0 && (
                  <div className="flex justify-end p-2 border-t border-border">
                    <Button size="sm" onClick={addSelected} disabled={loading}>
                      Add {selectedIds.size} selected
                    </Button>
                  </div>
                )}
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Your role</Label>
          <Select value={roleInput} onValueChange={setRoleInput}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((role) => (
                <SelectItem key={role} value={role}>{role}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
