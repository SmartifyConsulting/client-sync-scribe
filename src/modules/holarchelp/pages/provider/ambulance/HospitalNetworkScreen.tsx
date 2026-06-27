import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Clock } from "lucide-react";

export default function HospitalNetworkScreen() {
  const [activeTab, setActiveTab] = useState<"all" | "affiliated">("all");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Partnerships</p>
        <h1 className="text-3xl font-extrabold mt-2">Hospital Network</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {activeTab === "all" ? "All partner hospitals in your region" : "Your formal hospital affiliations"}
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(["all", "affiliated"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 transition-all ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "all" && "🏥 All Partners (12)"}
            {tab === "affiliated" && "⭐ My Affiliates (3)"}
          </button>
        ))}
      </div>

      {/* All Partners Tab */}
      {activeTab === "all" && (
        <div className="space-y-3">
          {[
            { name: "Central Hospital", distance: "3.2 km", wait: "15 min", trauma: true, affiliation: false },
            { name: "North General Hospital", distance: "5.1 km", wait: "22 min", trauma: false, affiliation: true },
            { name: "City Medical Centre", distance: "2.8 km", wait: "8 min", trauma: true, affiliation: true },
            { name: "South General", distance: "7.3 km", wait: "30 min", trauma: false, affiliation: false },
            { name: "East Regional", distance: "9.5 km", wait: "25 min", trauma: true, affiliation: false },
          ].map((hospital) => (
            <div key={hospital.name} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold">{hospital.name}</h3>
                    {hospital.affiliation && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">⭐ Affiliated</span>}
                    {hospital.trauma && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">🚑 Trauma Center</span>}
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {hospital.distance}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3 pt-3 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">ER Wait Time</p>
                  <p className="font-semibold">{hospital.wait}</p>
                </div>
                <div className="text-right">
                  <Button variant="outline" size="sm">View Details</Button>
                </div>
              </div>
              <Button variant="default" size="sm" className="w-full">Call Direct</Button>
            </div>
          ))}
        </div>
      )}

      {/* My Affiliates Tab */}
      {activeTab === "affiliated" && (
        <div className="space-y-3">
          {[
            { name: "North General Hospital", distance: "5.1 km", wait: "22 min", contact: "Direct line available", beds: 8 },
            { name: "City Medical Centre", distance: "2.8 km", wait: "8 min", contact: "Priority routing enabled", beds: 12 },
            { name: "Central Hospital", distance: "3.2 km", wait: "15 min", contact: "Integrated dispatch system", beds: 10 },
          ].map((hospital) => (
            <div key={hospital.name} className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold">{hospital.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-4 w-4" />
                    {hospital.distance}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">ER Wait</p>
                  <p className="font-semibold">{hospital.wait}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Available Beds</p>
                  <p className="font-semibold text-green-600">{hospital.beds}</p>
                </div>
                <div className="text-right">
                  <Button variant="outline" size="sm">Dashboard</Button>
                </div>
              </div>
              <p className="text-sm text-blue-700 mt-3 flex items-center gap-1">
                ✓ {hospital.contact}
              </p>
            </div>
          ))}

          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-bold mb-3">Affiliation Benefits</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Direct incident dispatch
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Real-time bed availability
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Priority routing
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Simplified billing integration
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
