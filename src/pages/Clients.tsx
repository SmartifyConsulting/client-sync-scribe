import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Filter, MoreVertical, Mail, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastSession: string;
  totalSessions: number;
  status: "active" | "inactive";
  avatar?: string;
}

const mockClients: Client[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "+1 (555) 123-4567",
    lastSession: "Today",
    totalSessions: 12,
    status: "active",
  },
  {
    id: "2",
    name: "Michael Chen",
    email: "m.chen@email.com",
    phone: "+1 (555) 234-5678",
    lastSession: "Yesterday",
    totalSessions: 8,
    status: "active",
  },
  {
    id: "3",
    name: "Emma Williams",
    email: "emma.w@email.com",
    phone: "+1 (555) 345-6789",
    lastSession: "3 days ago",
    totalSessions: 15,
    status: "active",
  },
  {
    id: "4",
    name: "David Brown",
    email: "d.brown@email.com",
    phone: "+1 (555) 456-7890",
    lastSession: "1 week ago",
    totalSessions: 5,
    status: "inactive",
  },
  {
    id: "5",
    name: "Lisa Anderson",
    email: "lisa.a@email.com",
    phone: "+1 (555) 567-8901",
    lastSession: "2 weeks ago",
    totalSessions: 20,
    status: "active",
  },
];

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredClients = mockClients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clients</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your client profiles and history
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Client List */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Client
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Last Session
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Sessions
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredClients.map((client, index) => (
                <tr
                  key={client.id}
                  className="group transition-colors hover:bg-muted/30"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="px-6 py-4">
                    <Link
                      to={`/clients/${client.id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground font-medium">
                        {client.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {client.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        {client.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {client.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {client.lastSession}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {client.totalSessions}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                        client.status === "active"
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {client.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
