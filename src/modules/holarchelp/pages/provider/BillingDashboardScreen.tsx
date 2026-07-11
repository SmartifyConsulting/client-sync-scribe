import { Button } from "@/components/ui/button";
import { TrendingUp, FileText, CreditCard, AlertCircle } from "lucide-react";

export default function BillingDashboardScreen() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Finance</p>
        <h1 className="text-3xl font-extrabold mt-2">Billing & Client Management</h1>
        <p className="text-sm text-muted-foreground mt-2">Manage contracts, invoices, and payments</p>
      </header>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Monthly Revenue</p>
          <p className="text-2xl font-bold mt-2">$24,500</p>
          <p className="text-xs text-success mt-1">↑ 8% vs last month</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Pending Invoices</p>
          <p className="text-2xl font-bold mt-2">$8,750</p>
          <p className="text-xs text-warning mt-1">6 invoices</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Paid This Month</p>
          <p className="text-2xl font-bold mt-2">$18,200</p>
          <p className="text-xs text-success mt-1">74% collected</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Active Contracts</p>
          <p className="text-2xl font-bold mt-2">12</p>
          <p className="text-xs text-primary mt-1">All active</p>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Recent Invoices
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-left">Invoice ID</th>
                <th className="p-2 text-left">Client</th>
                <th className="p-2 text-left">Amount</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                { id: "INV-001", client: "City Hospital", amount: "$2,500", status: "Paid", due: "2026-06-15" },
                { id: "INV-002", client: "North Medical", amount: "$1,800", status: "Pending", due: "2026-06-30" },
                { id: "INV-003", client: "Central Clinic", amount: "$3,200", status: "Overdue", due: "2026-06-10" },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/30">
                  <td className="p-2 font-semibold">{row.id}</td>
                  <td className="p-2">{row.client}</td>
                  <td className="p-2">{row.amount}</td>
                  <td className="p-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        row.status === "Paid"
                          ? "bg-success/10 text-success"
                          : row.status === "Pending"
                            ? "bg-warning/10 text-warning"
                            : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="p-2 text-muted-foreground">{row.due}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Contracts */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h2 className="font-bold text-lg">Active Contracts</h2>
        <div className="space-y-2">
          {[
            { client: "City Hospital", value: "$2,500/month", expires: "2027-06-30" },
            { client: "North Medical", value: "$1,800/month", expires: "2026-12-31" },
            { client: "Central Clinic", value: "$3,200/month", expires: "2027-03-15" },
          ].map((contract, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/50">
              <div>
                <p className="font-semibold text-sm">{contract.client}</p>
                <p className="text-xs text-muted-foreground">Expires: {contract.expires}</p>
              </div>
              <p className="font-semibold">{contract.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline">Generate Invoice</Button>
        <Button variant="outline">New Contract</Button>
        <Button variant="outline">Payment Tracking</Button>
        <Button variant="outline">Rate Cards</Button>
      </div>
    </div>
  );
}
