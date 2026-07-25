import { Loader2, MapPin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ERProvider {
  id: string;
  name: string;
  distance_km: number;
  eta_minutes: number;
  capacity_percent: number;
  available_units: number;
  total_units: number;
  status: "available" | "limited" | "unavailable";
  is_affiliated: boolean;
}

const MOCK_PROVIDERS: ERProvider[] = [
  {
    id: "provider_001",
    name: "Central Ambulance Service",
    distance_km: 3.2,
    eta_minutes: 8,
    capacity_percent: 60,
    available_units: 2,
    total_units: 5,
    status: "available",
    is_affiliated: true,
  },
  {
    id: "provider_002",
    name: "North Medical Services",
    distance_km: 5.1,
    eta_minutes: 12,
    capacity_percent: 80,
    available_units: 1,
    total_units: 5,
    status: "limited",
    is_affiliated: true,
  },
  {
    id: "provider_003",
    name: "East Emergency Services",
    distance_km: 7.8,
    eta_minutes: 18,
    capacity_percent: 100,
    available_units: 0,
    total_units: 4,
    status: "unavailable",
    is_affiliated: false,
  },
];

const STATUS_CONFIG = {
  available: {
    icon: "âœ“",
    color: "text-green-600",
    bgColor: "bg-green-50",
    badgeColor: "bg-green-100 text-green-800",
    label: "AVAILABLE",
  },
  limited: {
    icon: "âš ",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    badgeColor: "bg-orange-100 text-orange-800",
    label: "LIMITED CAPACITY",
  },
  unavailable: {
    icon: "âœ—",
    color: "text-red-600",
    bgColor: "bg-red-50",
    badgeColor: "bg-red-100 text-red-800",
    label: "NO CAPACITY",
  },
};

export function ProviderAvailabilityPanel({ onSelectProvider }: { onSelectProvider: (providerId: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Available ER Providers</h3>
        <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
      </div>

      {MOCK_PROVIDERS.map((provider) => {
        const config = STATUS_CONFIG[provider.status];
        const canDispatch = provider.status !== "unavailable";

        return (
          <div
            key={provider.id}
            className={`rounded-xl border-2 p-4 space-y-3 ${config.bgColor} border-current`}
            style={{ borderColor: config.color }}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-bold text-base">{provider.name}</h4>
              </div>
              <span className={`text-2xl font-bold ${config.color}`}>{config.icon}</span>
            </div>

            {/* Distance & ETA */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Distance</p>
                  <p className="font-semibold">{provider.distance_km} km</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ETA</p>
                <p className="font-semibold">{provider.eta_minutes} min</p>
              </div>
            </div>

            {/* Capacity Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Capacity</span>
                <span className="font-semibold">
                  {provider.available_units}/{provider.total_units} units available
                </span>
              </div>
              <div className="w-full h-3 bg-gray-300 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    provider.status === "available"
                      ? "bg-green-600"
                      : provider.status === "limited"
                        ? "bg-orange-600"
                        : "bg-red-600"
                  }`}
                  style={{ width: `${provider.capacity_percent}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground text-right">{provider.capacity_percent}% capacity</p>
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-between gap-2">
              <span className={`px-3 py-1 rounded text-sm font-semibold ${config.badgeColor}`}>
                Status: {config.label}
              </span>
            </div>

            {/* Action Button */}
            <Button
              className="w-full"
              onClick={() => onSelectProvider(provider.id)}
              disabled={!canDispatch}
              variant={canDispatch ? "default" : "outline"}
            >
              {canDispatch ? "Select & Dispatch" : "Cannot Dispatch"}
            </Button>

            {!canDispatch && (
              <div className="flex items-start gap-2 p-2 bg-red-100 rounded text-sm text-red-800">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>No ambulances currently available. Select alternative provider.</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

