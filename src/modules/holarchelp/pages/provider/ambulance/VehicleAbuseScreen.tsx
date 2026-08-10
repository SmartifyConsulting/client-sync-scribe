import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, MapPin, Clock, Zap, AlertCircle, TrendingUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/40",
  high: "bg-warning/15 text-warning border-warning/40/40",
  medium: "bg-warning/15 text-warning border-warning/40",
  low: "bg-primary/15 text-primary border-primary/40/40",
};

interface AbuseEvent {
  id: string;
  ambulance_id: string;
  vehicle_code?: string;
  event_type: string;
  severity: string;
  location?: string;
  occurred_at: string;
  description: string;
  coordinates?: { lat: number; lng: number };
  speed?: number;
  outside_hours?: boolean;
  authorized_route?: string;
  actual_route?: string;
}

export default function VehicleAbuseScreen() {
  const { providerId } = useProviderAccess();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AbuseEvent[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    loadEvents();
  }, [providerId]);

  const loadEvents = async () => {
    if (!providerId) return;
    setLoading(true);
    try {
      // For now, we'll use mock data since the table doesn't exist yet
      // In production, this would query from the abuse_events table
      setEvents([
        {
          id: "evt_001",
          ambulance_id: "amb_001",
          vehicle_code: "AMB-001",
          event_type: "geofence_breach",
          severity: "high",
          location: "Unauthorized Area - Downtown",
          occurred_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          description: "Vehicle left designated operating area",
          coordinates: { lat: -33.9249, lng: 18.4241 },
        },
        {
          id: "evt_002",
          ambulance_id: "amb_002",
          vehicle_code: "AMB-002",
          event_type: "speeding",
          severity: "medium",
          location: "Main Road - Zone 5",
          occurred_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          description: "Excessive speed detected: 95 km/h in 60 km/h zone",
          speed: 95,
        },
        {
          id: "evt_003",
          ambulance_id: "amb_003",
          vehicle_code: "AMB-003",
          event_type: "after_hours_use",
          severity: "critical",
          location: "Depot",
          occurred_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          description: "Vehicle movement outside operating hours (22:45 - unscheduled)",
          outside_hours: true,
        },
        {
          id: "evt_004",
          ambulance_id: "amb_001",
          vehicle_code: "AMB-001",
          event_type: "unlinked_trip",
          severity: "high",
          location: "Private Residence Area",
          occurred_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          description: "Vehicle movement without authorized incident or dispatch",
        },
        {
          id: "evt_005",
          ambulance_id: "amb_004",
          vehicle_code: "AMB-004",
          event_type: "harsh_driving",
          severity: "medium",
          location: "Highway - North Exit",
          occurred_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          description: "Harsh braking detected - 3 incidents in 10 minutes",
        },
      ]);
    } catch (error) {
      console.error("Failed to load abuse events:", error);
      toast.error("Failed to load vehicle abuse events");
    } finally {
      setLoading(false);
    }
  };

  const criticalCount = events.filter((e) => e.severity === "critical").length;
  const highCount = events.filter((e) => e.severity === "high").length;
  const mediumCount = events.filter((e) => e.severity === "medium").length;

  const EventIcon = ({ type }: { type: string }) => {
    switch (type) {
      case "geofence_breach":
        return <MapPin className="h-4 w-4" />;
      case "speeding":
        return <TrendingUp className="h-4 w-4" />;
      case "after_hours_use":
        return <Clock className="h-4 w-4" />;
      case "unlinked_trip":
        return <AlertCircle className="h-4 w-4" />;
      case "harsh_driving":
        return <Zap className="h-4 w-4" />;
      case "route_deviation":
        return <MapPin className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const EventBadge = ({ type }: { type: string }) => {
    const labels: Record<string, string> = {
      geofence_breach: "Geofence Breach",
      speeding: "Speeding",
      after_hours_use: "After-Hours Use",
      unlinked_trip: "Unlinked Trip",
      harsh_driving: "Harsh Driving",
      route_deviation: "Route Deviation",
    };
    return <span className="text-xs font-bold uppercase">{labels[type] || type}</span>;
  };

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Emergency Response Dispatch
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Vehicle Abuse Prevention</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Monitor suspicious vehicle activity, geofence breaches, and unauthorized usage.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Critical Events
              </p>
              <p className="mt-1 text-2xl font-bold text-destructive">{criticalCount}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-destructive/40" />
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                High Risk
              </p>
              <p className="mt-1 text-2xl font-bold text-warning">{highCount}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-warning/40" />
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Medium Priority
              </p>
              <p className="mt-1 text-2xl font-bold text-warning">{mediumCount}</p>
            </div>
            <Zap className="h-8 w-8 text-warning/40" />
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Events
              </p>
              <p className="mt-1 text-2xl font-bold">{events.length}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">All Events</TabsTrigger>
          <TabsTrigger value="geofence">Geofence</TabsTrigger>
          <TabsTrigger value="hours">After-Hours</TabsTrigger>
          <TabsTrigger value="routes">Routes</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-2">
          <div className="overflow-hidden rounded-2xl border bg-card">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : events.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <AlertTriangle className="mx-auto mb-2 h-5 w-5 opacity-50" />
                No abuse events detected.
              </div>
            ) : (
              <div className="divide-y">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      "flex items-start justify-between gap-4 p-4 hover:bg-muted/40",
                      SEVERITY_COLORS[event.severity]
                    )}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <EventIcon type={event.event_type} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{event.vehicle_code}</span>
                          <span className={`rounded-full border px-2 py-0.5 ${SEVERITY_COLORS[event.severity]}`}>
                            <EventBadge type={event.event_type} />
                          </span>
                        </div>
                        <p className="text-xs mt-1">{event.description}</p>
                        {event.location && (
                          <p className="text-xs mt-1 opacity-75">📍 {event.location}</p>
                        )}
                        <p className="text-xs mt-1 opacity-60">
                          {new Date(event.occurred_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="whitespace-nowrap">
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="geofence" className="space-y-2">
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="p-8 text-center text-xs text-muted-foreground">
              <MapPin className="mx-auto mb-2 h-5 w-5 opacity-50" />
              <p>Geofence Management & Breach Alerts coming soon.</p>
              <p className="mt-2 text-sm">Create geographic boundaries and get alerted when vehicles breach them.</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hours" className="space-y-2">
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="p-8 text-center text-xs text-muted-foreground">
              <Clock className="mx-auto mb-2 h-5 w-5 opacity-50" />
              <p>After-Hours Detection coming soon.</p>
              <p className="mt-2 text-sm">Track vehicles that are used outside scheduled operating hours.</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="routes" className="space-y-2">
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="p-8 text-center text-xs text-muted-foreground">
              <MapPin className="mx-auto mb-2 h-5 w-5 opacity-50" />
              <p>Route Deviation & Tracking coming soon.</p>
              <p className="mt-2 text-sm">Monitor if ambulances follow dispatch routes or deviate.</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
