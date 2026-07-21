import { toastError } from "@/lib/userMessage";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProviderAccess } from "../../../components/ProviderGate";
import { AmbulanceFormDialog, type AmbulanceRow } from "../../../components/AmbulanceFormDialog";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Ambulance, Loader2, Wrench } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface VehicleWithDetails extends AmbulanceRow {
  make_model?: string;
  location?: string;
  mileage_km?: number;
  last_service_date?: string;
  next_service_date?: string;
}

const STATUS_TONE: Record<string, string> = {
  available: "bg-success/15 text-success border-success/40",
  assigned: "bg-warning/15 text-warning border-warning/40",
  out_of_service: "bg-muted text-muted-foreground border-border",
};

const STATUS_CONFIG = {
  available: { icon: "✓", label: "AVAILABLE", color: "text-success", bg: "bg-success/10", badge: "bg-success/10 text-success" },
  assigned: { icon: "🚑", label: "IN-SERVICE", color: "text-warning", bg: "bg-warning/10", badge: "bg-warning/10 text-warning" },
  out_of_service: { icon: "⚙", label: "MAINTENANCE", color: "text-muted-foreground", bg: "bg-muted", badge: "bg-muted text-muted-foreground" },
};

const MOCK_VEHICLE_DETAILS: Record<string, VehicleWithDetails> = {
  "AMB-001": {
    provider_id: "",
    id: "1",
    vehicle_code: "AMB-001",
    registration_number: "REG-2023-001",
    status: "available",
    notes: "",
    make_model: "Mercedes-Benz Sprinter",
    location: "Central Depot",
    mileage_km: 45230,
    last_service_date: "2026-06-15",
    next_service_date: "2026-09-15",
  },
  "AMB-002": {
    provider_id: "",
    id: "2",
    vehicle_code: "AMB-002",
    registration_number: "REG-2023-002",
    status: "assigned",
    notes: "",
    make_model: "Mercedes-Benz Sprinter",
    location: "North District",
    mileage_km: 52150,
    last_service_date: "2026-05-20",
    next_service_date: "2026-08-20",
  },
  "AMB-003": {
    provider_id: "",
    id: "3",
    vehicle_code: "AMB-003",
    registration_number: "REG-2023-003",
    status: "out_of_service",
    notes: "",
    make_model: "Volkswagen Transporter",
    location: "Workshop",
    mileage_km: 38900,
    last_service_date: "2026-04-10",
    next_service_date: "2026-07-10",
  },
};

export default function FleetPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { providerId } = useProviderAccess();
  const [rows, setRows] = useState<VehicleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [edit, setEdit] = useState<AmbulanceRow | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AmbulanceRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "assigned" | "out_of_service">("all");

  const load = async () => {
    if (!providerId) return;
    setLoading(true);
    const { data } = await supabase.from("ambulances" as any)
      .select("*").eq("provider_id", providerId).order("vehicle_code");
    const vehicles = ((data as any) ?? []) as AmbulanceRow[];
    const withDetails = vehicles.map(v => ({
      ...v,
      ...MOCK_VEHICLE_DETAILS[v.vehicle_code],
    })) as VehicleWithDetails[];
    setRows(withDetails);
    setLoading(false);
  };

  const filteredRows = statusFilter === "all"
    ? rows
    : rows.filter(r => r.status === statusFilter);

  const stats = {
    total: rows.length,
    available: rows.filter(r => r.status === "available").length,
    assigned: rows.filter(r => r.status === "assigned").length,
    maintenance: rows.filter(r => r.status === "out_of_service").length,
    avgMileage: rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + (r.mileage_km || 0), 0) / rows.length)
      : 0,
    overdue: rows.filter(r => {
      if (!r.next_service_date) return false;
      const nextService = new Date(r.next_service_date);
      const today = new Date();
      return nextService < today;
    }).length,
  };

  const calculateDaysUntilService = (nextServiceDate?: string) => {
    if (!nextServiceDate) return null;
    const next = new Date(nextServiceDate);
    const today = new Date();
    const diff = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
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
  }, [providerId, user?.id]);

  const remove = async () => {
    if (!confirmDelete?.id) return;
    if (confirmDelete.status === "assigned") {
      toast.error(t("fleet.cannotDeleteAssigned"));
      setConfirmDelete(null); return;
    }
    const { error } = await supabase.from("ambulances" as any).delete().eq("id", confirmDelete.id);
    if (error) { toastError(error, "We couldn't complete that. Please try again."); return; }
    toast.success(t("fleet.removed"));
    setConfirmDelete(null);
    load();
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ambulance Operations</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Fleet Management</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {stats.total} vehicles total • {stats.available} available • {stats.assigned} in-service • {stats.maintenance} maintenance
        </p>
      </header>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(["all", "available", "assigned", "out_of_service"] as const).map((f) => (
          <Button
            key={f}
            variant={statusFilter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(f)}
            className="capitalize whitespace-nowrap"
          >
            {f === "all" ? "All" : f === "out_of_service" ? "Maintenance" : f === "assigned" ? "In-Service" : "Available"}
          </Button>
        ))}
      </div>

      {/* Fleet Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Average Mileage</p>
          <p className="text-2xl font-bold mt-1">{stats.avgMileage.toLocaleString()} km</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Fleet Age</p>
          <p className="text-2xl font-bold mt-1">3.2 years</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Maintenance Overdue</p>
          <p className={`text-2xl font-bold mt-1 ${stats.overdue > 0 ? "text-destructive" : "text-success"}`}>{stats.overdue}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Next 30 Days</p>
          <p className="text-2xl font-bold mt-1">{rows.filter(r => {
            const days = calculateDaysUntilService(r.next_service_date);
            return days !== null && days > 0 && days <= 30;
          }).length}</p>
        </div>
      </div>

      {/* Vehicles Accordion (collapsed by default) */}
      <Accordion type="single" collapsible className="space-y-3">
        <AccordionItem
          value="vehicles"
          className="rounded-xl border border-primary bg-card shadow-sm"
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Ambulance className="h-4 w-4 text-primary" /> Vehicles ({filteredRows.length})
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-2xl border bg-muted p-12 text-center">
          <Ambulance className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No vehicles found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRows.map((vehicle) => {
            const config = STATUS_CONFIG[vehicle.status || "available"];
            const daysUntilService = calculateDaysUntilService(vehicle.next_service_date);
            const isServiceOverdue = daysUntilService !== null && daysUntilService < 0;
            const isServiceSoon = daysUntilService !== null && daysUntilService > 0 && daysUntilService <= 30;

            return (
              <div
                key={vehicle.id}
                className={cn("rounded-xl border border-border p-4 space-y-3", config.bg)}
              >

                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{vehicle.vehicle_code}</h3>
                      <span className={`text-lg font-bold ${config.color}`}>{config.icon}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{vehicle.make_model || "—"}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.badge}`}>
                    {config.label}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-semibold text-sm mt-1">{vehicle.location || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mileage</p>
                    <p className="font-semibold text-sm mt-1">{vehicle.mileage_km?.toLocaleString()} km</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Service</p>
                    <p className="font-semibold text-sm mt-1">{vehicle.last_service_date || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Next Service</p>
                    <p className={`font-semibold text-sm mt-1 ${isServiceOverdue ? "text-destructive" : isServiceSoon ? "text-warning" : ""}`}>
                      {vehicle.next_service_date || "—"}
                      {daysUntilService !== null && daysUntilService !== 0 && (
                        <span className="text-xs ml-1">
                          ({isServiceOverdue ? "OVERDUE" : `${daysUntilService} days`})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">View Profile</Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Wrench className="h-4 w-4 mr-1" />
                    Service
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9"
                        onClick={() => { setEdit(vehicle); setOpen(true); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-destructive"
                        onClick={() => setConfirmDelete(vehicle)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>


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
            <AlertDialogTitle>{t("fleet.removeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("fleet.removeDescription", { vehicle: confirmDelete?.vehicle_code })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
