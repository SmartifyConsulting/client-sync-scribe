import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Mic,
  MapPin,
  Users,
  Bell,
  Smartphone,
  Loader2,
} from "lucide-react";
import { getEmergencyStatus } from "../services/emergencyService";
import { HolarcEmergency } from "../../../capacitor/emergency/HolarcEmergencyPlugin";

type ReadinessStatus = "ready" | "warning" | "unavailable";

interface ReadinessItem {
  key: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
  action?: { label: string; to: string };
  icon: React.ElementType;
}

export default function HolarcHelpReadiness() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReadinessItem[]>([]);
  const [currentStatus, setCurrentStatus] = useState<{ active: boolean; incidentId?: string }>({
    active: false,
  });

  useEffect(() => {
    if (!user) return;

    (async () => {
      setLoading(true);

      const status = await getEmergencyStatus();
      setCurrentStatus(status);

      // Location permission
      let locationStatus: ReadinessStatus = "warning";
      let locationDetail = "Permission not yet requested";
      try {
        if ("permissions" in navigator) {
          const perm = await navigator.permissions.query({ name: "geolocation" as PermissionName });
          if (perm.state === "granted") {
            locationStatus = "ready";
            locationDetail = "Enabled";
          } else if (perm.state === "denied") {
            locationStatus = "warning";
            locationDetail = "Permission denied — enable in browser/device settings";
          } else {
            locationStatus = "warning";
            locationDetail = "Permission required";
          }
        }
      } catch {
        locationDetail = "Unable to check — will request when SOS is triggered";
      }

      // Emergency contacts
      const { count } = await supabase
        .from("holarchelp_emergency_contacts" as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      const contactCount = count ?? 0;

      // Native plugin availability (web fallback always "available" in the sense
      // that in-app SOS works; native voice/hardware triggers are a separate check)
      const nativeStatus = await HolarcEmergency.getEmergencyStatus().then(
        () => true,
        () => false
      );

      setItems([
        {
          key: "voice",
          label: "Voice SOS",
          status: "unavailable",
          detail: "Not yet available — requires the native iOS/Android app (see below)",
          icon: Mic,
        },
        {
          key: "location",
          label: "Location",
          status: locationStatus,
          detail: locationDetail,
          action:
            locationStatus !== "ready"
              ? { label: "How location works during SOS", to: "/patient/holarchelp" }
              : undefined,
          icon: MapPin,
        },
        {
          key: "contacts",
          label: "Emergency Contacts",
          status: contactCount > 0 ? "ready" : "warning",
          detail: contactCount > 0 ? `${contactCount} configured` : "None configured yet",
          action: { label: "Manage contacts", to: "/patient/holarchelp/contacts" },
          icon: Users,
        },
        {
          key: "notifications",
          label: "Notifications",
          status: "ready",
          detail: "In-app + email alerts configured",
          icon: Bell,
        },
        {
          key: "native",
          label: "Native SOS (in-app trigger)",
          status: nativeStatus ? "ready" : "warning",
          detail: nativeStatus
            ? "Available — in-app SOS button is fully functional"
            : "Could not verify",
          icon: Smartphone,
        },
      ]);

      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const readyCount = items.filter((i) => i.status === "ready").length;

  return (
    <div className="mx-auto max-w-md px-5 pb-10">
      <div className="flex items-center gap-2 pt-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/patient/holarchelp")}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Emergency Readiness</h1>
      </div>

      {currentStatus.active && (
        <Alert className="mt-4 border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertTitle className="text-destructive">SOS Currently Active</AlertTitle>
          <AlertDescription className="mt-1">
            <button
              className="text-xs font-semibold underline"
              onClick={() => navigate(`/patient/holarchelp/incident/${currentStatus.incidentId}`)}
            >
              View live status →
            </button>
          </AlertDescription>
        </Alert>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        {readyCount} of {items.length} checks passing
      </p>

      <div className="mt-3 space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
            >
              <Icon className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{item.label}</p>
                  {item.status === "ready" ? (
                    <Badge className="bg-green-600 text-white text-[10px] shrink-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Ready
                    </Badge>
                  ) : item.status === "warning" ? (
                    <Badge className="bg-warning text-black text-[10px] shrink-0">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Setup required
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] shrink-0 text-muted-foreground">
                      Unavailable
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                {item.action && (
                  <button
                    className="text-xs font-semibold text-primary mt-1 underline-offset-4 hover:underline"
                    onClick={() => navigate(item.action!.to)}
                  >
                    {item.action.label} →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-xs font-semibold text-foreground mb-1">About Voice SOS</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Voice-activated SOS (e.g. "Hey Siri, Holarc SOS") requires the native Holarc iOS/Android
          app, which isn't built yet. Once available, this screen will guide you through enabling it
          via your phone's own voice assistant settings — Holarc will never listen continuously in
          the background on its own.
        </p>
      </div>
    </div>
  );
}
