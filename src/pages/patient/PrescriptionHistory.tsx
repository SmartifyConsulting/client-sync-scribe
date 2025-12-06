import { useState } from "react";
import { FileText, Calendar, User, Pill, Download, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format, subDays, subMonths } from "date-fns";

interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  prescribedDate: Date;
  doctor: string;
  status: "active" | "completed" | "refill_needed";
  instructions: string;
  refillsRemaining: number;
}

const mockPrescriptions: Prescription[] = [
  {
    id: "1",
    medication: "Amoxicillin 500mg",
    dosage: "500mg",
    frequency: "3 times daily",
    prescribedDate: subDays(new Date(), 5),
    doctor: "Dr. Georgia Adams",
    status: "active",
    instructions: "Take with food. Complete the full course.",
    refillsRemaining: 0,
  },
  {
    id: "2",
    medication: "Omeprazole 20mg",
    dosage: "20mg",
    frequency: "Once daily (morning)",
    prescribedDate: subDays(new Date(), 30),
    doctor: "Dr. Georgia Adams",
    status: "refill_needed",
    instructions: "Take 30 minutes before breakfast.",
    refillsRemaining: 2,
  },
  {
    id: "3",
    medication: "Vitamin D3 1000IU",
    dosage: "1000IU",
    frequency: "Once daily",
    prescribedDate: subMonths(new Date(), 2),
    doctor: "Dr. Georgia Adams",
    status: "active",
    instructions: "Take with a meal containing fat for better absorption.",
    refillsRemaining: 5,
  },
  {
    id: "4",
    medication: "Ibuprofen 400mg",
    dosage: "400mg",
    frequency: "As needed (max 3 times daily)",
    prescribedDate: subMonths(new Date(), 3),
    doctor: "Dr. Georgia Adams",
    status: "completed",
    instructions: "Take with food. Do not exceed recommended dose.",
    refillsRemaining: 0,
  },
];

const statusColors = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  refill_needed: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

const statusLabels = {
  active: "Active",
  completed: "Completed",
  refill_needed: "Refill Needed",
};

export default function PrescriptionHistory() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "refill_needed">("all");

  const filteredPrescriptions = mockPrescriptions.filter((rx) => {
    const matchesSearch = rx.medication.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || rx.status === filter;
    return matchesSearch && matchesFilter;
  });

  const activePrescriptions = mockPrescriptions.filter((rx) => rx.status === "active").length;
  const refillNeeded = mockPrescriptions.filter((rx) => rx.status === "refill_needed").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Prescription History</h1>
        <p className="text-muted-foreground">View and manage your prescriptions</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Prescriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activePrescriptions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Refills Needed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{refillNeeded}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Prescriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockPrescriptions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Prescriptions</CardTitle>
              <CardDescription>Your complete prescription history</CardDescription>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Search medications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-[200px]"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {(["all", "active", "refill_needed", "completed"] as const).map((status) => (
              <Button
                key={status}
                variant={filter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(status)}
              >
                {status === "all" ? "All" : statusLabels[status]}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPrescriptions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No prescriptions found
              </p>
            ) : (
              filteredPrescriptions.map((rx) => (
                <div
                  key={rx.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Pill className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{rx.medication}</p>
                        <p className="text-sm text-muted-foreground">{rx.frequency}</p>
                      </div>
                      <Badge className={statusColors[rx.status]}>
                        {statusLabels[rx.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{rx.instructions}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Prescribed: {format(rx.prescribedDate, "MMM d, yyyy")}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {rx.doctor}
                      </span>
                      {rx.refillsRemaining > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {rx.refillsRemaining} refill(s) remaining
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
