import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";

const MONTHLY_DATA = [
  { month: "Jan", incidents: 120, revenue: 18000, utilisation: 72 },
  { month: "Feb", incidents: 135, revenue: 19500, utilisation: 75 },
  { month: "Mar", incidents: 118, revenue: 17800, utilisation: 71 },
  { month: "Apr", incidents: 152, revenue: 22000, utilisation: 82 },
  { month: "May", incidents: 165, revenue: 24200, utilisation: 85 },
  { month: "Jun", incidents: 178, revenue: 26500, utilisation: 88 },
];

export default function ExecutiveDashboardScreen() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Analytics</p>
        <h1 className="text-3xl font-extrabold mt-2">Executive Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-2">Strategic insights and business metrics</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">YTD Incidents</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold">868</p>
            <div className="flex items-center gap-1 text-success">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-semibold">+12%</span>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">YTD Revenue</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold">$128K</p>
            <div className="flex items-center gap-1 text-success">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-semibold">+18%</span>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Fleet Efficiency</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold">84%</p>
            <div className="flex items-center gap-1 text-success">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-semibold">+5%</span>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Safety Score</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold">94/100</p>
            <div className="flex items-center gap-1 text-success">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-semibold">Excellent</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Performance Trends */}
      <Card className="p-4">
        <h2 className="font-bold text-lg mb-4">Performance Trends</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={MONTHLY_DATA}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="incidents" stroke="#3B82F6" name="Incidents" />
            <Line type="monotone" dataKey="utilisation" stroke="#10B981" name="Utilisation %" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Revenue Trend */}
      <Card className="p-4">
        <h2 className="font-bold text-lg mb-4">Monthly Revenue</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={MONTHLY_DATA}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="revenue" fill="#10B981" name="Revenue ($)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <h3 className="font-bold">Operational Metrics</h3>
          <div className="space-y-2">
            {[
              { label: "Average Response Time", value: "7.2 minutes", trend: "↓ 5%" },
              { label: "Customer Satisfaction", value: "4.8/5.0", trend: "↑ 2%" },
              { label: "Fleet Availability", value: "92%", trend: "↑ 3%" },
              { label: "On-Time Delivery", value: "98%", trend: "→ Stable" },
            ].map((metric, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm p-2 rounded bg-muted/50">
                <span className="text-muted-foreground">{metric.label}</span>
                <div className="text-right">
                  <p className="font-semibold">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">{metric.trend}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-bold">Risk & Compliance</h3>
          <div className="space-y-2">
            {[
              { label: "Insurance Claims", value: "2 this month", status: "low" },
              { label: "Safety Incidents", value: "0 this month", status: "good" },
              { label: "Compliance Status", value: "100%", status: "good" },
              { label: "Pending Audits", value: "0", status: "good" },
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm p-2 rounded bg-muted/50">
                <span className="text-muted-foreground">{item.label}</span>
                <p className={`font-semibold ${item.status === "good" ? "text-success" : "text-warning"}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
