import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, MapPin, Loader2, AlertCircle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GeofenceFormDialog, type GeofenceRow } from "../../../components/GeofenceFormDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const GEOFENCE_TYPE_COLORS: Record<string, string> = {
  depot: "bg-primary/15 text-primary border-primary/40/40",
  hospital: "bg-success/15 text-success border-success/40/40",
  no_go: "bg-destructive/15 text-destructive border-destructive/40",
  service_center: "bg-warning/15 text-warning border-warning/40/40",
  standby: "bg-accent/15 text-accent-foreground border-purple-500/40",
};

const GEOFENCE_TYPE_LABELS: Record<string, string> = {
  depot: "Depot",
  hospital: "Hospital",
  no_go: "No-Go Zone",
  service_center: "Service Center",
  standby: "Standby Point",
};

interface GeofenceType {
  id: string;
  name: string;
  type: "depot" | "hospital" | "no_go" | "service_center" | "standby";
  latitude: number;
  longitude: number;
  radius_km: number;
  created_at: string;
  provider_id: string;
}

export default function GeofenceScreen() {
  const { providerId } = useProviderAccess();
  const [geofences, setGeofences] = useState<GeofenceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<GeofenceType | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<GeofenceType | null>(null);

  useEffect(() => {
    loadGeofences();
  }, [providerId]);

  const loadGeofences = async () => {
    if (!providerId) return;
    setLoading(true);
    try {
      // Mock data for now - table doesn't exist yet
      setGeofences([
        {
          id: "gf_001",
          name: "Main Depot",
          type: "depot",
          latitude: -33.9249,
          longitude: 18.4241,
          radius_km: 2,
          created_at: new Date().toISOString(),
          provider_id: providerId,
        },
        {
          id: "gf_002",
          name: "Central Hospital",
          type: "hospital",
          latitude: -33.9250,
          longitude: 18.4242,
          radius_km: 1.5,
          created_at: new Date().toISOString(),
          provider_id: providerId,
        },
        {
          id: "gf_003",
          name: "Private School Zone",
          type: "no_go",
          latitude: -33.9251,
          longitude: 18.4243,
          radius_km: 0.5,
          created_at: new Date().toISOString(),
          provider_id: providerId,
        },
      ]);
    } catch (error) {
      console.error("Failed to load geofences:", error);
      toast.error("Failed to load geofences");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete?.id) return;
    try {
      // Would delete from DB here
      toast.success("Geofence removed");
      setConfirmDelete(null);
      loadGeofences();
    } catch (error) {
      toast.error("Failed to remove geofence");
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Geofence Management</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Create geographic zones and receive alerts when vehicles enter or leave them.
          </p>
        </div>
        <Button size="sm" onClick={() => { setEdit(null); setOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> Add geofence
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Active Geofences
          </p>
          <p className="mt-1 text-2xl font-bold">{geofences.length}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Restricted Zones
          </p>
          <p className="mt-1 text-2xl font-bold text-destructive">
            {geofences.filter((g) => g.type === "no_go").length}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Coverage Area
          </p>
          <p className="mt-1 text-2xl font-bold">
            {geofences.reduce((sum, g) => sum + g.radius_km, 0).toFixed(1)} km
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/40/20">
          <AlertCircle className="h-4 w-4 text-primary" />
          <p className="text-xs text-primary">
            💡 Create geofences around depots, hospitals, and restricted areas. Vehicles will be monitored for breaches.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : geofences.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            <MapPin className="mx-auto mb-2 h-5 w-5 opacity-50" />
            No geofences configured yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Location</th>
                <th className="px-3 py-2 text-left">Radius</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {geofences.map((geofence) => (
                <tr key={geofence.id} className="hover:bg-muted/40">
                  <td className="px-3 py-2 font-semibold">{geofence.name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-xs font-bold uppercase",
                        GEOFENCE_TYPE_COLORS[geofence.type]
                      )}
                    >
                      {GEOFENCE_TYPE_LABELS[geofence.type]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {geofence.latitude.toFixed(4)}°, {geofence.longitude.toFixed(4)}°
                  </td>
                  <td className="px-3 py-2 text-xs">{geofence.radius_km} km</td>
                  <td className="px-3 py-2 text-right space-x-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => { setEdit(geofence); setOpen(true); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setConfirmDelete(geofence)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {providerId && (
        <GeofenceFormDialog
          open={open}
          onOpenChange={setOpen}
          providerId={providerId}
          initial={edit}
          onSaved={loadGeofences}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove geofence?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.name}" will be removed. Vehicles will no longer be monitored for breaches in this area.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
