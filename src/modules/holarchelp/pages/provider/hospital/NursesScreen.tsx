import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ImportNursesDialog } from "./ImportNursesDialog";
import { Plus, UserPlus, Gift, Star } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/userMessage";

type Nurse = {
  id: string;
  full_name: string;
  status: string;
  role_title: string | null;
  email: string | null;
  mobile_number: string | null;
  nurse_registration_number: string | null;
  linked_user_id: string | null;
};

export default function NursesScreen() {
  const { providerId } = useProviderAccess();
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [pendingTotals, setPendingTotals] = useState<Record<string, number>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!providerId) return;
    setLoading(true);
    const [nursesRes, vulasRes, ratingsRes] = await Promise.all([
      supabase.from("hospital_nurses" as any).select("*").eq("hospital_id", providerId).order("full_name"),
      supabase.from("nurse_pending_vulas" as any).select("hospital_nurse_id, vulas_count, claimed_at"),
      supabase.from("nurse_record_ratings" as any).select("nurse_id, rating"),
    ]);
    setNurses(((nursesRes.data as any) ?? []) as Nurse[]);

    const totals: Record<string, number> = {};
    ((vulasRes.data as any) ?? []).forEach((v: any) => {
      if (v.claimed_at) return; // only pending
      totals[v.hospital_nurse_id] = (totals[v.hospital_nurse_id] ?? 0) + (v.vulas_count ?? 0);
    });
    setPendingTotals(totals);

    const rAgg: Record<string, { sum: number; n: number }> = {};
    ((ratingsRes.data as any) ?? []).forEach((r: any) => {
      const cur = rAgg[r.nurse_id] ?? { sum: 0, n: 0 };
      cur.sum += r.rating;
      cur.n += 1;
      rAgg[r.nurse_id] = cur;
    });
    const avg: Record<string, number> = {};
    Object.entries(rAgg).forEach(([k, v]) => (avg[k] = v.sum / v.n));
    setRatings(avg);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [providerId]);

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Our Nurses</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Build your nursing roster. Inactive nurses can be selected on admission records; their Vulas claim automatically when they sign up.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {providerId && <AddNurseDialog hospitalId={providerId} onAdded={load} />}
          {providerId && <ImportNursesDialog hospitalId={providerId} onImported={load} />}
        </div>
      </header>

      <div className="grid gap-2">
        {nurses.map((n) => (
          <Card key={n.id} className="p-3 flex items-center justify-between gap-3 border-primary/15">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{n.full_name}</p>
                <Badge variant={n.status === "active" ? "default" : "outline"} className="text-xs">
                  {n.status}
                </Badge>
                {ratings[n.id] !== undefined && (
                  <span className="inline-flex items-center gap-0.5 text-sm text-muted-foreground">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {ratings[n.id].toFixed(1)}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {n.role_title || "Nurse"}
                {n.email && ` · ${n.email}`}
                {n.nurse_registration_number && ` · #${n.nurse_registration_number}`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Pending Vulas</p>
              <p className="text-sm font-bold inline-flex items-center gap-1">
                <Gift className="h-3.5 w-3.5 text-primary" /> {pendingTotals[n.id] ?? 0}
              </p>
            </div>
          </Card>
        ))}
        {!nurses.length && !loading && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No nurses on roster yet. Import a CSV or add one manually.
          </Card>
        )}
      </div>
    </div>
  );
}

function AddNurseDialog({ hospitalId, onAdded }: { hospitalId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [full_name, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role_title, setRoleTitle] = useState("");
  const [mobile_number, setMobile] = useState("");
  const [nurse_registration_number, setRegNo] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!full_name.trim()) {
      toast.error("Name is required");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("hospital_nurses" as any).insert({
      hospital_id: hospitalId,
      full_name: full_name.trim(),
      email: email.trim().toLowerCase() || null,
      role_title: role_title.trim() || null,
      mobile_number: mobile_number.trim() || null,
      nurse_registration_number: nurse_registration_number.trim() || null,
      status: "inactive",
    });
    setBusy(false);
    if (error) {
      toastError(error, "We couldn't complete that. Please try again.");
      return;
    }
    toast.success("Nurse added");
    setFullName(""); setEmail(""); setRoleTitle(""); setMobile(""); setRegNo("");
    setOpen(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1"><UserPlus className="h-3.5 w-3.5" /> Add nurse</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add nurse to roster</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-sm">Full name *</Label><Input value={full_name} onChange={(e) => setFullName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-sm">Role / Title</Label><Input value={role_title} onChange={(e) => setRoleTitle(e.target.value)} placeholder="RN ICU" /></div>
            <div><Label className="text-sm">Registration #</Label><Input value={nurse_registration_number} onChange={(e) => setRegNo(e.target.value)} placeholder="SANC-..." /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-sm">Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label className="text-sm">Mobile</Label><Input value={mobile_number} onChange={(e) => setMobile(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}><Plus className="h-3.5 w-3.5 mr-1" />{busy ? "Saving..." : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
