import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock, Wrench } from "lucide-react";

interface MaintenanceItem {
  id: string;
  vehicle: string;
  type: string;
  status: "pending" | "in-progress" | "completed" | "overdue";
  dueDate: string;
  cost: number;
}

const MOCK_MAINTENANCE: MaintenanceItem[] = [
  {
    id: "1",
    vehicle: "AMB-001",
    type: "Oil Change",
    status: "pending",
    dueDate: "2026-06-30",
    cost: 150,
  },
  {
    id: "2",
    vehicle: "AMB-002",
    type: "Filter Replacement",
    status: "in-progress",
    dueDate: "2026-06-28",
    cost: 200,
  },
  {
    id: "3",
    vehicle: "AMB-003",
    type: "Brake Service",
    status: "overdue",
    dueDate: "2026-06-20",
    cost: 500,
  },
  {
    id: "4",
    vehicle: "AMB-004",
    type: "Full Service",
    status: "completed",
    dueDate: "2026-06-25",
    cost: 800,
  },
];

export default function MaintenanceDashboardScreen() {
  const stats = {
    pending: MOCK_MAINTENANCE.filter((m) => m.status === "pending").length,
    inProgress: MOCK_MAINTENANCE.filter((m) => m.status === "in-progress").length,
    overdue: MOCK_MAINTENANCE.filter((m) => m.status === "overdue").length,
    totalCost: MOCK_MAINTENANCE.reduce((sum, m) => sum + m.cost, 0),
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "in-progress":
        return <Wrench className="h-5 w-5 text-blue-600" />;
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "overdue":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Fleet Care</p>
        <h1 className="text-3xl font-extrabold mt-2">Maintenance Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-2">Track service schedules and vehicle maintenance</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold mt-2 text-yellow-600">{stats.pending}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">In Progress</p>
          <p className="text-2xl font-bold mt-2 text-blue-600">{stats.inProgress}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Overdue</p>
          <p className="text-2xl font-bold mt-2 text-red-600">{stats.overdue}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Cost</p>
          <p className="text-2xl font-bold mt-2">${stats.totalCost.toLocaleString()}</p>
        </div>
      </div>

      {/* Maintenance Items */}
      <div className="space-y-3">
        {MOCK_MAINTENANCE.map((item) => (
          <div key={item.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                {getStatusIcon(item.status)}
                <div>
                  <p className="font-bold text-lg">{item.vehicle}</p>
                  <p className="text-sm text-muted-foreground">{item.type}</p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  item.status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : item.status === "in-progress"
                      ? "bg-blue-100 text-blue-800"
                      : item.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                }`}
              >
                {item.status.replace("-", " ")}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Due Date</p>
                <p className="font-semibold text-sm mt-1">{item.dueDate}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estimated Cost</p>
                <p className="font-semibold text-sm mt-1">${item.cost}</p>
              </div>
              <div className="text-right">
                <Button variant="outline" size="sm">
                  Update
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline">Schedule Service</Button>
        <Button variant="outline">View Warranty</Button>
      </div>
    </div>
  );
}
