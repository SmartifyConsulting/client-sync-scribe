import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface VehicleType {
  id: string;
  name: string;
  code: string;
  capacity: string;
  crew: number;
  equipment: string[];
  cost: number;
  count: number;
}

const MOCK_TYPES: VehicleType[] = [
  {
    id: "1",
    name: "Type-A Ambulance",
    code: "TYPE-A",
    capacity: "3 + 2 Stretchers",
    crew: 3,
    equipment: ["AED", "Oxygen", "First Aid Kit", "Stretcher"],
    cost: 8500,
    count: 5,
  },
  {
    id: "2",
    name: "Type-B Ambulance",
    code: "TYPE-B",
    capacity: "2 + 1 Stretcher",
    crew: 2,
    equipment: ["AED", "Oxygen", "First Aid Kit"],
    cost: 5200,
    count: 3,
  },
  {
    id: "3",
    name: "ICU Mobile Unit",
    code: "ICU",
    capacity: "1 + 1 Stretcher",
    crew: 4,
    equipment: ["Ventilator", "Monitor", "Oxygen", "Full Medical Suite"],
    cost: 12000,
    count: 2,
  },
];

export default function VehicleTypeManagementScreen() {
  const [types, setTypes] = useState<VehicleType[]>(MOCK_TYPES);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Fleet Configuration</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-2">Vehicle Types</h1>
          <p className="text-sm text-muted-foreground mt-2">Manage ambulance types, equipment, and configurations</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Type
        </Button>
      </header>

      {/* Vehicle Types Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {types.map((type) => (
          <div
            key={type.id}
            className={`rounded-xl border p-4 space-y-3 transition-all ${
              editingId === type.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg">{type.name}</h3>
                <p className="text-sm text-muted-foreground">{type.code}</p>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setEditingId(editingId === type.id ? null : type.id)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Specifications */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <p className="text-sm text-muted-foreground">Capacity</p>
                <p className="font-semibold text-sm">{type.capacity}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Crew Size</p>
                <p className="font-semibold text-sm">{type.crew} members</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Cost</p>
                <p className="font-semibold text-sm">${type.cost.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Fleet</p>
                <p className="font-semibold text-sm">{type.count} vehicles</p>
              </div>
            </div>

            {/* Equipment */}
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-2">Standard Equipment</p>
              <div className="flex flex-wrap gap-2">
                {type.equipment.map((item) => (
                  <span key={item} className="px-2 py-1 rounded-full bg-muted text-sm font-medium">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Edit Form */}
            {editingId === type.id && (
              <div className="pt-4 space-y-3 border-t">
                <input
                  type="text"
                  defaultValue={type.name}
                  placeholder="Name"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <input
                  type="number"
                  defaultValue={type.cost}
                  placeholder="Monthly Cost"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1">
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-bold text-lg mb-4">Fleet Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Types</p>
            <p className="text-2xl font-bold mt-1">{types.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Vehicles</p>
            <p className="text-2xl font-bold mt-1">{types.reduce((sum, t) => sum + t.count, 0)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg Monthly Cost</p>
            <p className="text-2xl font-bold mt-1">
              ${Math.round(types.reduce((sum, t) => sum + t.cost, 0) / types.length).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Crew Capacity</p>
            <p className="text-2xl font-bold mt-1">{types.reduce((sum, t) => sum + t.crew * t.count, 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

