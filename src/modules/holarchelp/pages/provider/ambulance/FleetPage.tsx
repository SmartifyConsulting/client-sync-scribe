import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProviderAccess } from "../../../components/ProviderGate";
import { AmbulanceFormDialog, type AmbulanceRow } from "../../../components/AmbulanceFormDialog";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Ambulance, Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const STATUS_TONE: Record<string, string> = {
  available: "bg-success/15 text-success border-success/40",
  assigned: "bg-warning/15 text-warning border-warning/40",
  out_of_service: "bg-muted text-muted-foreground border-border",
};

export default function FleetPage() {
  const { user } = useAuth();
  const { providerId } = useProviderAccess();
  const [rows, setRows] = useState<AmbulanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [edit, setEdit] = useState<AmbulanceRow | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AmbulanceRow | null>(null);

  const load = async () => {
    if (!providerId) return;
    setLoading(true);
    const { data } = await supabase.from("ambulances" as any)
      .select("*").eq("provider_id", providerId).order("vehicle_code");
    setRows(((data as any) ?? []) as AmbulanceRow[]);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      if (!providerId || !user) return;
      const { data: ok } = await supabase.rpc("is_ambulance_admin" as any, {
        _provider_id: providerId, _user_id: user.id,
      } as any);
      setIsAdmin(!!ok);
    })();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId, user?.id]);

  const remove = async () => {
    if (!confirmDelete?.id) return;
    if (confirmDelete.status === "assigned") {
      toast.error("Can't delete an ambulance that's currently assigned");
      setConfirmDelete(null); return;
    }
    const { error } = await supabase.from("ambulances" as any).delete().eq("id", confirmDelete.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Ambulance removed");
    setConfirmDelete(null);
    load();
  };

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Emergency Response Dispatch</p>
          <h1 className="text-2xl font-extrabold">Fleet</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {isAdmin ? "Manage your ambulances and operational status." : "View your team's ambulance fleet."}
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => { setEdit(null); setOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Add ambulance
          </Button>
        )}
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            <Ambulance className="mx-auto mb-2 h-5 w-5 opacity-50" />
            No ambulances yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Vehicle</th>
                <th className="px-3 py-2 text-left">Registration</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Notes</th>
                {isAdmin && <th className="px-3 py-2 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/40">
                  <td className="px-3 py-2 font-semibold">{r.vehicle_code}</td>
                  <td className="px-3 py-2 text-xs">{r.registration_number ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_TONE[r.status ?? "available"] ?? STATUS_TONE.available}`}>
                      {(r.status ?? "available").replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground">{r.notes ?? ""}</td>
                  {isAdmin && (
                    <td className="px-3 py-2 text-right space-x-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEdit(r); setOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setConfirmDelete(r)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {providerId && (
        <AmbulanceFormDialog
          open={open}
          onOpenChange={setOpen}
          providerId={providerId}
          initial={edit}
          onSaved={load}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove ambulance?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.vehicle_code} will be removed from your fleet. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
