import { useState } from "react";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Navigation } from "lucide-react";

interface LocationData {
  method: "manual" | "gps" | "what3words" | "search";
  address: string;
  latitude?: number;
  longitude?: number;
  what3words_code?: string;
  landmark?: string;
}

export default function IncidentLocationScreen() {
  const { providerId } = useProviderAccess();
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<LocationData["method"]>("manual");
  const [location, setLocation] = useState<LocationData>({
    method: "manual",
    address: "",
    latitude: undefined,
    longitude: undefined,
  });

  const handleGPSCapture = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation((prev) => ({
            ...prev,
            method: "gps",
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            address: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
          }));
          setLoading(false);
        },
        () => {
          alert("Unable to get GPS location");
          setLoading(false);
        }
      );
    }
  };

  const handleSubmit = () => {
    if (!location.address) {
      alert("Please provide an address or location");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      window.location.href = `/provider/hospital/incident/create/triage`;
    }, 500);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold">Capture Incident Location</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pin the exact location of the emergency
        </p>
      </header>

      <div className="grid gap-6 max-w-2xl">
        {/* Location Methods */}
        <div className="space-y-3">
          <div
            onClick={() => setSelectedMethod("manual")}
            className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${
              selectedMethod === "manual"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <h3 className="font-semibold mb-2">📝 Manual Address Entry</h3>
            {selectedMethod === "manual" && (
              <input
                type="text"
                value={location.address}
                onChange={(e) =>
                  setLocation((prev) => ({
                    ...prev,
                    address: e.target.value,
                    method: "manual",
                  }))
                }
                placeholder="Enter street address, building name, or location description"
                className="mt-2 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            )}
          </div>

          <div
            onClick={handleGPSCapture}
            className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${
              selectedMethod === "gps"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              <h3 className="font-semibold">📍 GPS Location</h3>
            </div>
            {selectedMethod === "gps" && location.latitude && (
              <div className="mt-2 text-sm text-muted-foreground">
                Latitude: {location.latitude.toFixed(6)} | Longitude:{" "}
                {location.longitude?.toFixed(6)}
              </div>
            )}
            {selectedMethod === "gps" && !location.latitude && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGPSCapture();
                }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Get My Location
              </Button>
            )}
          </div>

          <div
            onClick={() => setSelectedMethod("what3words")}
            className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${
              selectedMethod === "what3words"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <h3 className="font-semibold mb-2">🗺️ What3Words Code</h3>
            {selectedMethod === "what3words" && (
              <input
                type="text"
                value={location.what3words_code || ""}
                onChange={(e) =>
                  setLocation((prev) => ({
                    ...prev,
                    what3words_code: e.target.value,
                    method: "what3words",
                  }))
                }
                placeholder="e.g. table.cloth.horse"
                className="mt-2 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            )}
          </div>

          <div
            onClick={() => setSelectedMethod("search")}
            className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${
              selectedMethod === "search"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <h3 className="font-semibold mb-2">🏥 Search Landmark</h3>
            {selectedMethod === "search" && (
              <input
                type="text"
                value={location.landmark || ""}
                onChange={(e) =>
                  setLocation((prev) => ({
                    ...prev,
                    landmark: e.target.value,
                    method: "search",
                  }))
                }
                placeholder="Search hospitals, malls, schools..."
                className="mt-2 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            )}
          </div>
        </div>

        {/* Location Summary */}
        {location.address && (
          <div className="rounded-2xl border bg-blue-50 p-4">
            <div className="flex gap-2">
              <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Location Confirmed</p>
                <p className="text-sm text-blue-700 mt-1">{location.address}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.history.back()}
          >
            Back
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={loading || !location.address}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Next: Triage Assessment"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
