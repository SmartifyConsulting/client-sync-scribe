import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Settings, AlertCircle, CheckCircle2, Wifi, WifiOff } from "lucide-react";

interface Provider {
  id: string;
  name: string;
  status: "connected" | "disconnected" | "error";
  lastSync: string;
  devices: number;
  dataPoints: number;
}

const MOCK_PROVIDERS: Provider[] = [
  {
    id: "1",
    name: "Samsara Telematics",
    status: "connected",
    lastSync: "2 minutes ago",
    devices: 12,
    dataPoints: 48500,
  },
  {
    id: "2",
    name: "Geotab",
    status: "connected",
    lastSync: "5 minutes ago",
    devices: 8,
    dataPoints: 32000,
  },
  {
    id: "3",
    name: "Verizon Connect",
    status: "error",
    lastSync: "45 minutes ago",
    devices: 5,
    dataPoints: 0,
  },
];

export default function TelemetryHubScreen() {
  const [providers, setProviders] = useState<Provider[]>(MOCK_PROVIDERS);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "disconnected":
        return <WifiOff className="h-5 w-5 text-muted-foreground" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Integration</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-2">Telemetry Integration Hub</h1>
          <p className="text-sm text-muted-foreground mt-2">Connect and manage telematics providers</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Provider
        </Button>
      </header>

      {/* Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Connected Providers</p>
          <p className="text-2xl font-bold mt-2">2</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Devices</p>
          <p className="text-2xl font-bold mt-2">25</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Data Points/Hour</p>
          <p className="text-2xl font-bold mt-2">1,258</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">API Health</p>
          <p className="text-2xl font-bold text-success mt-2">98%</p>
        </div>
      </div>

      {/* Providers List */}
      <div className="space-y-3">
        {providers.map((provider) => (
          <div key={provider.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                {getStatusIcon(provider.status)}
                <div>
                  <h3 className="font-bold text-lg">{provider.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {provider.status === "connected"
                      ? `Last sync: ${provider.lastSync}`
                      : `Last sync: ${provider.lastSync} (error)`}
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  provider.status === "connected"
                    ? "bg-success/10 text-success"
                    : provider.status === "disconnected"
                      ? "bg-muted text-muted-foreground"
                      : "bg-destructive/10 text-destructive"
                }`}
              >
                {provider.status === "connected"
                  ? "Connected"
                  : provider.status === "disconnected"
                    ? "Disconnected"
                    : "Error"}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Devices</p>
                <p className="font-semibold text-sm mt-1">{provider.devices}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Points</p>
                <p className="font-semibold text-sm mt-1">{provider.dataPoints.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className={`font-semibold text-sm mt-1 ${
                  provider.status === "connected" ? "text-success" : "text-destructive"
                }`}>
                  {provider.status === "connected" ? "Healthy" : "Attention"}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" className="flex-1">
                Configure
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                View API Logs
              </Button>
              {provider.status === "error" && (
                <Button variant="outline" size="sm" className="flex-1 text-destructive">
                  Troubleshoot
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* API Field Mapping */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-bold text-lg">Telemetry Field Mapping</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-left">Field</th>
                <th className="p-2 text-left">Source</th>
                <th className="p-2 text-left">Data Type</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                { field: "GPS Location", source: "Samsara", type: "Coordinates", status: "âœ“" },
                { field: "Speed", source: "Samsara", type: "Number", status: "âœ“" },
                { field: "Fuel Level", source: "Geotab", type: "Percentage", status: "âœ“" },
                { field: "Engine Hours", source: "Geotab", type: "Number", status: "âœ“" },
                { field: "Hard Braking", source: "Samsara", type: "Boolean", status: "âœ“" },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/30">
                  <td className="p-2">{row.field}</td>
                  <td className="p-2 text-muted-foreground">{row.source}</td>
                  <td className="p-2 text-muted-foreground">{row.type}</td>
                  <td className="p-2 text-success">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

