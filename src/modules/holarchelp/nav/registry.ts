import {
  Activity,
  Ambulance,
  AlertTriangle,
  BarChart3,
  BedDouble,
  CalendarClock,
  ClipboardList,
  Clock,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  LucideIcon,
  Navigation as NavIcon,
  Radar,
  Siren,
  Stethoscope,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";
import type { ProviderCapabilities } from "../hooks/useProviderCapabilities";

export interface NavItem {
  icon: LucideIcon;
  /** i18n key; `label` is used as the fallback so new items work untranslated. */
  labelKey: string;
  label: string;
  to: string;
  end?: boolean;
  danger?: boolean;
}

export interface NavModule {
  id: string;
  /** Section heading; empty string renders an unlabelled group. */
  titleKey: string;
  title: string;
  /** Which provider portals this module can appear in. */
  portals: Array<"hospital" | "ambulance">;
  /** Capability predicate — the module renders only when this returns true. */
  enabled: (caps: ProviderCapabilities) => boolean;
  items: NavItem[];
}

const always = () => true;

/**
 * Central provider module registry. Future provider modules (Pharmacy,
 * Laboratory, Radiology, Blood Bank, Air Ambulance, Disaster Management…)
 * are added by appending an entry here — the sidebar needs no changes.
 */
export const PROVIDER_MODULES: NavModule[] = [
  {
    id: "operations",
    titleKey: "nav.moduleOperations",
    title: "Operations",
    portals: ["hospital"],
    enabled: always,
    items: [
      { icon: LayoutDashboard, labelKey: "nav.hospitalDashboard", label: "Dashboard", to: "/provider/hospital/dashboard" },
    ],
  },
  {
    id: "emergency",
    titleKey: "nav.moduleEmergency",
    title: "Emergency",
    portals: ["hospital"],
    enabled: (c) => c.hasEmergencyDepartment,
    items: [
      { icon: Siren, labelKey: "nav.erDashboard", label: "ER Dashboard", to: "/provider/hospital/er", danger: true },
      { icon: Activity, labelKey: "nav.liveQueue", label: "Live Queue", to: "/provider/hospital", end: true },
      { icon: Ambulance, labelKey: "nav.incomingAmbulances", label: "Incoming Ambulances", to: "/provider/hospital/incoming" },
      { icon: Stethoscope, labelKey: "nav.triageBoard", label: "Triage Board", to: "/provider/hospital/triage" },
      { icon: HeartPulse, labelKey: "nav.traumaBays", label: "Trauma Bays", to: "/provider/hospital/trauma-bays" },
    ],
  },
  {
    id: "patients",
    titleKey: "nav.modulePatients",
    title: "Patients",
    portals: ["hospital"],
    enabled: always,
    items: [
      { icon: ClipboardList, labelKey: "nav.admissions", label: "Admissions", to: "/provider/hospital/admissions" },
      { icon: BedDouble, labelKey: "nav.wards", label: "Wards", to: "/provider/hospital/wards" },
      { icon: Users, labelKey: "nav.inpatients", label: "Inpatients", to: "/provider/hospital/inpatients" },
      { icon: LogOut, labelKey: "nav.discharges", label: "Discharges", to: "/provider/hospital/discharges" },
    ],
  },
  {
    id: "staff",
    titleKey: "nav.moduleStaff",
    title: "Staff",
    portals: ["hospital"],
    enabled: always,
    items: [
      { icon: CalendarClock, labelKey: "nav.shifts", label: "Shift Schedule", to: "/provider/hospital/shifts" },
      { icon: Clock, labelKey: "nav.myShift", label: "My Shift", to: "/provider/hospital/my-shift" },
    ],
  },
  {
    id: "hospital-ambulance-services",
    titleKey: "nav.moduleAmbulanceServices",
    title: "Ambulance Services",
    portals: ["hospital"],
    enabled: (c) => c.operatesOwnAmbulanceFleet,
    items: [
      { icon: Siren, labelKey: "nav.dispatchDashboard", label: "Dispatch Dashboard", to: "/provider/hospital/dispatch", danger: true },
      { icon: Radar, labelKey: "nav.fleetLive", label: "Fleet Live", to: "/provider/hospital/monitoring" },
      { icon: Ambulance, labelKey: "nav.vehicles", label: "Vehicles", to: "/provider/hospital/vehicles" },
      { icon: Users, labelKey: "nav.crews", label: "Crew", to: "/provider/hospital/crews" },
      { icon: ClipboardList, labelKey: "nav.dispatchHistory", label: "Dispatch History", to: "/provider/hospital/dispatch-history" },
      { icon: Wrench, labelKey: "nav.vehicleMaintenance", label: "Vehicle Maintenance", to: "/provider/hospital/fleet" },
    ],
  },
  {
    id: "administration",
    titleKey: "nav.moduleAdministration",
    title: "Administration",
    portals: ["hospital"],
    enabled: always,
    items: [
      { icon: UserCheck, labelKey: "nav.hospitalAdmin", label: "Hospital Admin", to: "/provider/hospital/admin-dashboard" },
      { icon: Users, labelKey: "nav.admin", label: "Admin", to: "/provider/hospital/admins" },
    ],
  },
  {
    id: "analytics",
    titleKey: "nav.moduleAnalytics",
    title: "Analytics",
    portals: ["hospital"],
    enabled: always,
    items: [
      { icon: BarChart3, labelKey: "nav.analytics", label: "Analytics", to: "/provider/hospital/analytics" },
    ],
  },

  // ── Ambulance provider portal ────────────────────────────────────────────
  {
    id: "ambulance-live",
    titleKey: "nav.moduleLiveOperations",
    title: "Live Operations",
    portals: ["ambulance"],
    enabled: always,
    items: [
      { icon: Siren, labelKey: "nav.dispatchConsole", label: "Dispatch Console", to: "/provider/ambulance", end: true, danger: true },
      { icon: AlertTriangle, labelKey: "nav.incidents", label: "Incidents", to: "/provider/ambulance/incidents" },
      { icon: NavIcon, labelKey: "nav.fleetMap", label: "Fleet Map", to: "/provider/ambulance/monitoring" },
    ],
  },
  {
    id: "ambulance-ops",
    titleKey: "nav.moduleOperations",
    title: "Operations",
    portals: ["ambulance"],
    enabled: always,
    items: [
      { icon: Activity, labelKey: "nav.operationsDashboard", label: "Dashboard", to: "/provider/ambulance/ops-dashboard" },
      { icon: Ambulance, labelKey: "nav.vehicles", label: "Vehicles", to: "/provider/ambulance/vehicles" },
      { icon: Users, labelKey: "nav.crews", label: "Crews", to: "/provider/ambulance/crews" },
      { icon: HeartPulse, labelKey: "nav.hospitals", label: "Hospitals", to: "/provider/ambulance/hospitals" },
      { icon: ClipboardList, labelKey: "nav.reports", label: "Reports", to: "/provider/ambulance/reports" },
    ],
  },
  {
    id: "ambulance-admin",
    titleKey: "nav.moduleAdministration",
    title: "Administration",
    portals: ["ambulance"],
    enabled: always,
    items: [
      { icon: UserCheck, labelKey: "nav.admin", label: "Admin", to: "/provider/ambulance/admins" },
    ],
  },
];

export function getProviderModules(
  portal: "hospital" | "ambulance",
  capabilities: ProviderCapabilities,
): NavModule[] {
  return PROVIDER_MODULES.filter(
    (m) => m.portals.includes(portal) && m.enabled(capabilities),
  ).map((m) => ({
    ...m,
    items: m.items.filter((item) =>
      item.to === "/provider/hospital/incoming" ? capabilities.acceptsAmbulanceTransfers : true,
    ),
  }));
}
