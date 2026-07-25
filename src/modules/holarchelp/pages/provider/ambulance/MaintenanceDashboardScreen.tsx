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
        return <Clock className="h-5 w-5 text-warning" />;
      case "in-progress":
        return <Wrench className="h-5 w-5 text-primary" />;
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "overdue":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Fleet Care</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-2">Maintenance Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-2">Track service schedules and vehicle maintenance</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold mt-2 text-warning">{stats.pending}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">In Progress</p>
          <p className="text-2xl font-bold mt-2 text-primary">{stats.inProgress}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Overdue</p>
          <p className="text-2xl font-bold mt-2 text-destructive">{stats.overdue}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Cost</p>
          <p className="text-2xl font-bold mt-2">${stats.totalCost.toLocaleString()}</p>
        </div>
      </div>

      {/* Maintenance Items */}
      <div className="space-y-3">
        {MOCK_MAINTENANCE.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                {getStatusIcon(item.status)}
                <div>
                  <p className="font-bold text-lg">{item.vehicle}</p>
                  <p className="text-sm text-muted-foreground">{item.type}</p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  item.status === "pending"
                    ? "bg-warning/10 text-warning"
                    : item.status === "in-progress"
                      ? "bg-primary/10 text-primary"
                      : item.status === "completed"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                }`}
              >
                {item.status.replace("-", " ")}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-semibold text-sm mt-1">{item.dueDate}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Cost</p>
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

