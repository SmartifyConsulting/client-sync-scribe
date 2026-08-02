/**
 * Shared EMS building blocks for the Emergency Provider module.
 * Pure presentation — no data fetching, no styling changes to the design system.
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Siren, Clock, MapPin, Truck, Fuel, Wrench, User, Building2, AlertTriangle,
} from "lucide-react";
import { IncidentNumberBadge } from "@/components/IncidentNumberBadge";

/* ------------------------------------------------------------------ utils */

export const emsDistKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) => {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

/** Rough road ETA in minutes from a straight-line distance. */
export const emsEtaMinutes = (km: number | null | undefined) =>
  km == null ? null : Math.max(1, Math.round((km * 1.3) / 60 * 60));

export const emsAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
};

export const emsSeverityRank: Record<string, number> = {
  critical: 0, high: 1, moderate: 2, low: 3,
};

/* -------------------------------------------------------------- KPIStat */

export function KPIStat({
  label, value, hint, icon: Icon, tone = "muted",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ElementType;
  tone?: "destructive" | "success" | "warning" | "primary" | "muted";
}) {
  const toneClass =
    tone === "destructive" ? "text-destructive"
    : tone === "success" ? "text-success"
    : tone === "warning" ? "text-warning"
    : tone === "primary" ? "text-primary"
    : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </p>
      <p className={cn("mt-0.5 text-xl font-extrabold tabular-nums", toneClass)}>{value}</p>
      {hint ? <p className="text-xs text-muted-foreground mt-0.5">{hint}</p> : null}
    </div>
  );
}

/* ----------------------------------------------------------- StatusBadge */

type BadgeTone = "destructive" | "success" | "warning" | "primary" | "muted";

const badgeTone: Record<BadgeTone, string> = {
  destructive: "border-destructive/40 bg-destructive/10 text-destructive",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  primary: "border-primary/40 bg-primary/10 text-primary",
  muted: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({
  children, tone = "muted", className, icon: Icon,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
  icon?: React.ElementType;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold uppercase tracking-wider",
        badgeTone[tone],
        className,
      )}
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </span>
  );
}

export const severityTone = (s?: string | null): BadgeTone =>
  s === "critical" ? "destructive" : s === "high" ? "warning" : s === "low" ? "muted" : "warning";

export const vehicleStatusTone = (s?: string | null): BadgeTone => {
  const v = (s ?? "").toLowerCase();
  if (v === "available") return "success";
  if (v === "assigned" || v === "in_service" || v === "in-service") return "warning";
  if (v === "maintenance" || v === "out_of_service") return "muted";
  return "muted";
};

export const capacityTone = (s?: string | null): BadgeTone =>
  s === "green" ? "success" : s === "amber" ? "warning" : s === "red" ? "destructive" : "muted";

/* ---------------------------------------------------------- IncidentCard */

export type EmsIncident = {
  id: string;
  incident_number?: string | null;
  severity?: string | null;
  status?: string | null;
  created_at: string;
  incident_type?: string | null;
  notes?: string | null;
  caller_name?: string | null;
  patient_name?: string | null;
  distance_km?: number | null;
  assigned_ambulance_id?: string | null;
  mine?: boolean;
};

export function IncidentCard({
  incident, selected, onClick, draggable, onDragStart, onDragEnd, className,
}: {
  incident: EmsIncident;
  selected?: boolean;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  className?: string;
}) {
  const i = incident;
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border p-2 text-left transition",
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        selected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <IncidentNumberBadge
          number={i.incident_number ?? `INC-${i.id.slice(0, 8)}`}
          size="sm"
          showCopy={false}
          label="Ref"
        />
        <StatusBadge tone={severityTone(i.severity)} icon={Siren}>
          {i.severity ?? "high"}
        </StatusBadge>
      </div>
      <p className="mt-0.5 truncate text-xs">{i.incident_type ?? "Emergency"}</p>
      {(i.patient_name || i.caller_name) && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {i.patient_name ? <>Patient: {i.patient_name}</> : null}
          {i.patient_name && i.caller_name ? " · " : null}
          {i.caller_name ? <>Caller: {i.caller_name}</> : null}
        </p>
      )}
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" /> {emsAgo(i.created_at)} waiting
          {i.distance_km != null && <> · {i.distance_km.toFixed(1)} km</>}
        </p>
        {i.mine && (
          <StatusBadge tone="primary">
            {i.assigned_ambulance_id ? "Rolling" : "Needs vehicle"}
          </StatusBadge>
        )}
      </div>
    </button>
  );
}

/* ----------------------------------------------------------- VehicleCard */

export type EmsVehicle = {
  id: string;
  vehicle_code: string;
  registration_number?: string | null;
  status?: string | null;
  crew_name?: string | null;
  crew_count?: number;
  distance_km?: number | null;
  eta_min?: number | null;
  shift_label?: string | null;
  equipment_ok?: boolean;
  fuel_pct?: number | null;
  capability?: string | null;
};

export function VehicleCard({
  vehicle, recommended, selected, onClick, footer, className,
  onDragOver, onDragLeave, onDrop, dropActive,
}: {
  vehicle: EmsVehicle;
  recommended?: boolean;
  selected?: boolean;
  onClick?: () => void;
  footer?: React.ReactNode;
  className?: string;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  dropActive?: boolean;
}) {
  const v = vehicle;
  return (
    <div
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "rounded-lg border p-2 transition",
        onClick ? "cursor-pointer hover:bg-muted/50" : "",
        selected ? "border-primary bg-primary/5" : "",
        dropActive ? "border-dashed border-primary bg-primary/10 ring-2 ring-primary/40" : "",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-xs font-bold">
          <Truck className="h-3.5 w-3.5 text-primary" />
          {v.vehicle_code}
        </span>
        <div className="flex items-center gap-1">
          {recommended && <StatusBadge tone="primary">Recommended</StatusBadge>}
          <StatusBadge tone={vehicleStatusTone(v.status)}>{v.status ?? "unknown"}</StatusBadge>
        </div>
      </div>
      {v.registration_number && (
        <p className="mt-0.5 text-xs text-muted-foreground">{v.registration_number}</p>
      )}
      <p className="mt-0.5 text-xs text-muted-foreground">
        Crew: {v.crew_name ?? <span className="italic">no shift open</span>}
        {v.crew_count ? <> · {v.crew_count} on board</> : null}
      </p>
      <div className="mt-1 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {v.distance_km != null ? `${v.distance_km.toFixed(1)} km` : "distance n/a"}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {v.eta_min != null ? `${v.eta_min} min ETA` : "ETA n/a"}
        </span>
        <span className="flex items-center gap-1">
          <Wrench className="h-3 w-3" />
          {v.equipment_ok === false ? "Equipment issue" : "Equipment OK"}
        </span>
        <span className="flex items-center gap-1">
          <Fuel className="h-3 w-3" />
          {v.fuel_pct != null ? `${v.fuel_pct}% fuel` : "fuel n/a"}
        </span>
      </div>
      {v.shift_label && <p className="mt-0.5 text-xs text-muted-foreground">Shift: {v.shift_label}</p>}
      {footer}
    </div>
  );
}

/* -------------------------------------------------------------- CrewCard */

export type EmsCrew = {
  id: string;
  name: string;
  role?: string | null;
  state?: string | null;
  vehicle_code?: string | null;
  email?: string | null;
};

export const crewStateTone = (s?: string | null): BadgeTone => {
  switch ((s ?? "").toLowerCase()) {
    case "dispatched": return "destructive";
    case "on shift":
    case "available": return "success";
    case "hospital": return "warning";
    default: return "muted";
  }
};

export function CrewCard({
  crew, selected, onClick,
}: { crew: EmsCrew; selected?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border p-2 text-left transition",
        selected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1 text-xs font-bold">
          <User className="h-3.5 w-3.5 text-primary" />
          <span className="truncate">{crew.name}</span>
        </span>
        <StatusBadge tone={crewStateTone(crew.state)}>{crew.state ?? "offline"}</StatusBadge>
      </div>
      <p className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">
        {crew.role ?? "crew"}
        {crew.vehicle_code ? <> · {crew.vehicle_code}</> : null}
      </p>
    </button>
  );
}

/* ---------------------------------------------------------- HospitalCard */

export type EmsHospital = {
  id: string;
  name: string;
  ownership?: string | null;
  distance_km?: number | null;
  eta_min?: number | null;
  trauma_level?: string | null;
  er_capacity_status?: string | null;
  preferred?: boolean;
  capability?: string | null;
};

export function HospitalCard({
  hospital, selected, onClick, footer,
}: {
  hospital: EmsHospital;
  selected?: boolean;
  onClick?: () => void;
  footer?: React.ReactNode;
}) {
  const h = hospital;
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border p-2 transition",
        onClick ? "cursor-pointer" : "",
        selected ? "border-primary bg-primary/5" : onClick ? "hover:bg-muted/50" : "",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate text-xs font-bold">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            {h.name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="uppercase">{h.ownership ?? "private"}</span>
            {h.distance_km != null && <> · {h.distance_km.toFixed(1)} km</>}
            {h.eta_min != null && <> · {h.eta_min} min</>}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {h.capability ?? (h.trauma_level ? `Trauma ${h.trauma_level}` : "General ER")}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {h.preferred && <StatusBadge tone="primary">Preferred</StatusBadge>}
          {h.er_capacity_status && (
            <StatusBadge tone={capacityTone(h.er_capacity_status)}>{h.er_capacity_status}</StatusBadge>
          )}
        </div>
      </div>
      {footer}
    </div>
  );
}

/* -------------------------------------------------------------- Timeline */

export type EmsTimelineItem = {
  id: string;
  label: string;
  detail?: string | null;
  at?: string | null;
  tone?: BadgeTone;
};

export function Timeline({ items, empty = "No events yet." }: { items: EmsTimelineItem[]; empty?: string }) {
  if (!items.length) {
    return <p className="py-4 text-center text-xs text-muted-foreground">{empty}</p>;
  }
  return (
    <ol className="relative space-y-2 border-l border-border pl-3">
      {items.map((e) => (
        <li key={e.id} className="relative">
          <span
            className={cn(
              "absolute -left-[17px] top-1 h-2 w-2 rounded-full",
              e.tone === "destructive" ? "bg-destructive"
              : e.tone === "success" ? "bg-success"
              : e.tone === "warning" ? "bg-warning"
              : "bg-primary",
            )}
          />
          <p className="text-xs font-semibold">{e.label}</p>
          {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
          {e.at && (
            <p className="text-xs text-muted-foreground">
              {new Date(e.at).toLocaleString()} · {emsAgo(e.at)} ago
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

/* -------------------------------------------------------- AssignmentPanel */

export function AssignmentPanel({
  disabled, onAssign, onNotifyCrew, onNavigate, onNotifyHospital, hint,
}: {
  disabled?: boolean;
  onAssign?: () => void;
  onNotifyCrew?: () => void;
  onNavigate?: () => void;
  onNotifyHospital?: () => void;
  hint?: string;
}) {
  return (
    <div className="sticky bottom-0 z-20 -mx-1 mt-2 rounded-xl border bg-card/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="h-8 flex-1 min-w-[140px] text-xs font-bold" disabled={disabled} onClick={onAssign}>
          Assign Ambulance
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" disabled={disabled} onClick={onNotifyCrew}>
          Notify Crew
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" disabled={disabled} onClick={onNavigate}>
          Navigate
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" disabled={disabled} onClick={onNotifyHospital}>
          Notify Hospital
        </Button>
      </div>
      {hint && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <AlertTriangle className="h-3 w-3" /> {hint}
        </p>
      )}
    </div>
  );
}
