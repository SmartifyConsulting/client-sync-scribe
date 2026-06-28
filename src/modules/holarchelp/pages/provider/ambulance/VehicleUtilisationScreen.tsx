import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Card } from "@/components/ui/card";

const UTILISATION_DATA = [
  { vehicle: "AMB-001", utilisation: 85, target: 80 },
  { vehicle: "AMB-002", utilisation: 72, target: 80 },
  { vehicle: "AMB-003", utilisation: 45, target: 80 },
  { vehicle: "AMB-004", utilisation: 88, target: 80 },
  { vehicle: "AMB-005", utilisation: 92, target: 80 },
];

const USAGE_TREND = [
  { week: "W1", usage: 650, mileage: 2450 },
  { week: "W2", usage: 720, mileage: 2680 },
  { week: "W3", usage: 685, mileage: 2530 },
  { week: "W4", usage: 810, mileage: 3020 },
  { week: "W5", usage: 760, mileage: 2840 },
];

const COST_BREAKDOWN = [
  { name: "Fuel", value: 35, color: "#3B82F6" },
  { name: "Maintenance", value: 28, color: "#10B981" },
  { name: "Insurance", value: 22, color: "#F59E0B" },
  { name: "Depreciation", value: 15, color: "#EF4444" },
];

export default function VehicleUtilisationScreen() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Fleet Analytics</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-2">Vehicle Utilisation</h1>
        <p className="text-sm text-muted-foreground mt-2">Monitor fleet usage, efficiency, and costs</p>
      </header>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Average Utilisation</p>
          <p className="text-2xl font-bold mt-2">76.4%</p>
          <p className="text-xs text-success mt-1">↑ 5% vs last month</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Trips</p>
          <p className="text-2xl font-bold mt-2">3,675</p>
          <p className="text-xs text-success mt-1">↑ 12% vs last month</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Mileage</p>
          <p className="text-2xl font-bold mt-2">13,520</p>
          <p className="text-xs text-muted-foreground mt-1">km this month</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Operating Cost</p>
          <p className="text-2xl font-bold mt-2">$4,250</p>
          <p className="text-xs text-muted-foreground mt-1">per vehicle/month</p>
        </Card>
      </div>

      {/* Vehicle Utilisation Bar Chart */}
      <Card className="p-4">
        <h2 className="font-bold text-lg mb-4">Vehicle Utilisation Rate</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={UTILISATION_DATA}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="vehicle" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="utilisation" fill="#3B82F6" name="Actual %" />
            <Bar dataKey="target" fill="#D1D5DB" name="Target %" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Usage Trend Line Chart */}
      <Card className="p-4">
        <h2 className="font-bold text-lg mb-4">Usage Trend (5 Weeks)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={USAGE_TREND}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="usage" stroke="#3B82F6" name="Hours Used" />
            <Line yAxisId="right" type="monotone" dataKey="mileage" stroke="#10B981" name="Mileage (km)" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Cost Breakdown Pie Chart */}
      <Card className="p-4">
        <h2 className="font-bold text-lg mb-4">Operating Cost Breakdown</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={COST_BREAKDOWN}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {COST_BREAKDOWN.map((entry) => (
                <Cell key={`cell-${entry.name}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Detailed Metrics */}
      <Card className="p-4">
        <h2 className="font-bold text-lg mb-4">Detailed Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Average Hours/Day</span>
              <span className="font-semibold">8.2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Average Distance/Day</span>
              <span className="font-semibold">45.3 km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Fuel Consumption</span>
              <span className="font-semibold">6.8 L/100km</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Downtime (Maint.)</span>
              <span className="font-semibold">2.3%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Peak Usage Hours</span>
              <span className="font-semibold">08:00 - 18:00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Cost/km</span>
              <span className="font-semibold">$0.31</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
