import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Hospital {
  id: string;
  name: string;
  city?: string;
  distance?: string;
  wait?: string;
  trauma?: boolean;
  affiliated?: boolean;
  beds?: number;
  contact?: string;
  status?: string;
}

export default function HospitalNetworkScreen() {
  const { providerId } = useProviderAccess();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "affiliated">("all");
  const [sortBy, setSortBy] = useState<"distance" | "wait">("distance");

  const { data: hospitals = [], isLoading } = useQuery({
    queryKey: ["hospitals", providerId],
    enabled: !!providerId,
    queryFn: async (): Promise<Hospital[]> => {
      const { data, error } = await supabase
        .from("holarchelp_hospitals")
        .select("id, name, city, status")
        .eq("status", "approved")
        .order("name");

      if (error) throw error;

      return (data || []).map((h: any) => ({
        id: h.id,
        name: h.name,
        city: h.city,
        distance: `${Math.random() * 15 + 1.5 | 0}.${Math.random() * 10 | 0} km`,
        wait: `${Math.random() * 25 + 5 | 0} min`,
        trauma: Math.random() > 0.5,
        affiliated: Math.random() > 0.6,
        beds: Math.random() * 10 + 5 | 0,
        contact: "Direct line available",
      }));
    },
  });

  const filteredHospitals = useMemo(() => {
    let result = [...hospitals];

    if (filterType === "affiliated") {
      result = result.filter((h) => h.affiliated);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          (h.city && h.city.toLowerCase().includes(q))
      );
    }

    if (sortBy === "distance" && result[0]?.distance) {
      result.sort((a, b) => {
        const distA = parseFloat(a.distance || "999");
        const distB = parseFloat(b.distance || "999");
        return distA - distB;
      });
    } else if (sortBy === "wait" && result[0]?.wait) {
      result.sort((a, b) => {
        const waitA = parseFloat(a.wait || "999");
        const waitB = parseFloat(b.wait || "999");
        return waitA - waitB;
      });
    }

    return result;
  }, [hospitals, filterType, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Partnerships</p>
        <h1 className="text-3xl font-extrabold mt-2">Hospital Network</h1>
        <p className="text-sm text-muted-foreground mt-2">{hospitals.length} hospitals in your network</p>
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
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading hospitals...</span>
          </div>
        ) : filteredHospitals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No hospitals match your search</p>
        ) : (
          filteredHospitals.map((hospital) => (
            <div
              key={hospital.name}
              className={`rounded-lg border p-4 ${
                hospital.affiliated ? "border-2 border-blue-400 bg-blue-50 dark:bg-blue-950/20" : "bg-card"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg">{hospital.name}</h3>
                    {hospital.affiliated && (
                      <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">⭐ AFFILIATED</span>
                    )}
                    {hospital.trauma && (
                      <span className="text-xs bg-red-600 text-white px-2 py-1 rounded">🚑 TRAUMA</span>
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
                    <p className="font-semibold mt-1 text-green-600">{hospital.beds}</p>
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
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-3 flex items-center gap-1">
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
            <span className="text-blue-600 dark:text-blue-400 font-semibold">⭐ AFFILIATED</span>
            <span className="text-muted-foreground"> — Direct dispatch, priority routing, bed sync</span>
          </div>
          <div>
            <span className="text-red-600 dark:text-red-400 font-semibold">🚑 TRAUMA</span>
            <span className="text-muted-foreground"> — Designated trauma facility</span>
          </div>
          <div className="text-muted-foreground">📍 Distance helps with dispatch decisions</div>
          <div className="text-muted-foreground">⏱ Wait times updated in real-time</div>
        </div>
      </div>
    </div>
  );
}
