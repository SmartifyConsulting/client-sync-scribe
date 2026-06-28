import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Hospital {
  name: string;
  distance: string;
  wait: string;
  trauma: boolean;
  affiliated: boolean;
  beds?: number;
  contact?: string;
}

const HOSPITALS: Hospital[] = [
  { name: "Central Hospital", distance: "3.2 km", wait: "15 min", trauma: true, affiliated: false },
  { name: "North General Hospital", distance: "5.1 km", wait: "22 min", trauma: false, affiliated: true, beds: 8, contact: "Direct line available" },
  { name: "City Medical Centre", distance: "2.8 km", wait: "8 min", trauma: true, affiliated: true, beds: 12, contact: "Priority routing enabled" },
  { name: "South General", distance: "7.3 km", wait: "30 min", trauma: false, affiliated: false },
  { name: "East Regional", distance: "9.5 km", wait: "25 min", trauma: true, affiliated: false },
];

export default function HospitalNetworkScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "affiliated">("all");
  const [sortBy, setSortBy] = useState<"distance" | "wait">("distance");

  const filteredHospitals = useMemo(() => {
    let result = HOSPITALS;

    if (filterType === "affiliated") {
      result = result.filter((h) => h.affiliated);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((h) => h.name.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      if (sortBy === "distance") {
        return parseFloat(a.distance) - parseFloat(b.distance);
      }
      return parseFloat(a.wait) - parseFloat(b.wait);
    });

    return result;
  }, [filterType, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Partnerships</p>
        <h1 className="text-3xl font-extrabold mt-2">Hospital Network</h1>
        <p className="text-sm text-muted-foreground mt-2">15 partner hospitals in your network</p>
      </header>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hospitals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Hospitals</SelectItem>
            <SelectItem value="affiliated">Affiliated Only</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="distance">Sort: Distance</SelectItem>
            <SelectItem value="wait">Sort: Wait Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Hospitals Grid */}
      <div className="space-y-3">
        {filteredHospitals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No hospitals match your search</p>
        ) : (
          filteredHospitals.map((hospital) => (
            <div
              key={hospital.name}
              className={`rounded-lg border p-4 ${
                hospital.affiliated ? "border-2 border-primary/40 bg-primary/10" : "bg-card"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg">{hospital.name}</h3>
                    {hospital.affiliated && (
                      <span className="text-xs bg-primary text-white px-2 py-1 rounded">⭐ AFFILIATED</span>
                    )}
                    {hospital.trauma && (
                      <span className="text-xs bg-destructive text-white px-2 py-1 rounded">🚑 TRAUMA</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {hospital.distance} away
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-current border-opacity-20">
                <div>
                  <p className="text-xs text-muted-foreground">ER Wait Time</p>
                  <p className="font-semibold mt-1">{hospital.wait}</p>
                </div>
                {hospital.affiliated && hospital.beds && (
                  <div>
                    <p className="text-xs text-muted-foreground">Available Beds</p>
                    <p className="font-semibold mt-1 text-success">{hospital.beds}</p>
                  </div>
                )}
                <div className="text-right">
                  {hospital.affiliated ? (
                    <Button variant="outline" size="sm">Dashboard</Button>
                  ) : (
                    <Button variant="outline" size="sm">Apply</Button>
                  )}
                </div>
              </div>

              {hospital.affiliated && hospital.contact && (
                <p className="text-sm text-primary mt-3 flex items-center gap-1">
                  ✓ {hospital.contact}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Key Indicators */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-bold mb-3">Key indicators</h3>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-primary font-semibold">⭐ AFFILIATED</span>
            <span className="text-muted-foreground"> — Direct dispatch, priority routing, bed sync</span>
          </div>
          <div>
            <span className="text-destructive font-semibold">🚑 TRAUMA</span>
            <span className="text-muted-foreground"> — Designated trauma facility</span>
          </div>
          <div className="text-muted-foreground">📍 Distance helps with dispatch decisions</div>
          <div className="text-muted-foreground">⏱ Wait times updated in real-time</div>
        </div>
      </div>
    </div>
  );
}
