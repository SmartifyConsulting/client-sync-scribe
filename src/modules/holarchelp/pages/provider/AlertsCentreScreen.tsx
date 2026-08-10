import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

interface Alert {
  id: string;
  type: "critical" | "warning" | "info";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const MOCK_ALERTS: Alert[] = [
  {
    id: "1",
    type: "critical",
    title: "Vehicle Breakdown",
    message: "AMB-002 experienced engine failure on Main Street. Immediate assistance required.",
    time: "2 minutes ago",
    read: false,
  },
  {
    id: "2",
    type: "critical",
    title: "Driver Alert",
    message: "Mike Brown - License expiry in 3 months. Renewal required soon.",
    time: "15 minutes ago",
    read: false,
  },
  {
    id: "3",
    type: "warning",
    title: "Maintenance Overdue",
    message: "AMB-003 overdue for service. Last service was 2 months ago.",
    time: "1 hour ago",
    read: false,
  },
  {
    id: "4",
    type: "warning",
    title: "Speeding Event",
    message: "Vehicle AMB-005 exceeded speed limit by 15 km/h on Highway 101.",
    time: "2 hours ago",
    read: true,
  },
  {
    id: "5",
    type: "info",
    title: "System Update",
    message: "New features available in Fleet Management module. Update now.",
    time: "4 hours ago",
    read: true,
  },
];

const getAlertIcon = (type: string) => {
  switch (type) {
    case "critical":
      return <AlertCircle className="h-5 w-5 text-destructive" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-warning" />;
    case "info":
      return <Info className="h-5 w-5 text-primary" />;
  }
};

const getAlertColor = (type: string) => {
  switch (type) {
    case "critical":
      return "border-red-200 bg-destructive/10";
    case "warning":
      return "border-orange-200 bg-warning/10";
    case "info":
      return "border-blue-200 bg-primary/10";
  }
};

export default function AlertsCentreScreen() {
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [filter, setFilter] = useState<"all" | "unread" | "critical">("all");

  const filteredAlerts = alerts.filter((a) => {
    if (filter === "unread") return !a.read;
    if (filter === "critical") return a.type === "critical";
    return true;
  });

  const stats = {
    total: alerts.length,
    unread: alerts.filter((a) => !a.read).length,
    critical: alerts.filter((a) => a.type === "critical").length,
  };

  const markAsRead = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  };

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Notifications</p>
        <h1 className="text-3xl font-extrabold mt-2">Alerts Centre</h1>
        <p className="text-sm text-muted-foreground mt-2">Critical events and notifications</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Alerts</p>
          <p className="text-2xl font-bold mt-2">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Unread</p>
          <p className="text-2xl font-bold mt-2 text-warning">{stats.unread}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Critical</p>
          <p className="text-2xl font-bold mt-2 text-destructive">{stats.critical}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "unread", "critical"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f as any)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg border-2 p-4 transition-all ${getAlertColor(alert.type)} ${
                !alert.read ? "shadow-md" : "opacity-75"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{alert.title}</h3>
                    <p className="text-sm mt-1">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">{alert.time}</p>
                  </div>
                </div>
                {!alert.read && (
                  <span className="h-3 w-3 rounded-full bg-destructive flex-shrink-0 mt-1" />
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t">
                {!alert.read && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAsRead(alert.id)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Mark as Read
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto text-destructive"
                  onClick={() => dismissAlert(alert.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border bg-muted p-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No alerts to display</p>
          </div>
        )}
      </div>

      {/* Alert Settings */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="font-bold text-lg mb-3">Alert Preferences</h2>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <span className="text-sm">Critical Alerts - Push Notifications</span>
          </label>
          <label className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <span className="text-sm">Maintenance Alerts - Email</span>
          </label>
          <label className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <span className="text-sm">Safety Events - SMS</span>
          </label>
          <label className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer">
            <input type="checkbox" className="w-4 h-4" />
            <span className="text-sm">System Updates - Email</span>
          </label>
        </div>
        <Button className="mt-4" size="sm">
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
