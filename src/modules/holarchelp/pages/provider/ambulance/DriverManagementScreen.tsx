import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Search } from "lucide-react";

interface Member {
  id: string;
  name: string;
  role: "paramedic" | "emt" | "driver";
  email: string;
  phone: string;
  status: "active" | "inactive";
}

const MOCK_MEMBERS: Member[] = [
  { id: "1", name: "Alice Martinez", role: "paramedic", email: "alice@example.com", phone: "+27 82 123 4567", status: "active" },
  { id: "2", name: "James Miller", role: "paramedic", email: "james@example.com", phone: "+27 82 234 5678", status: "active" },
  { id: "3", name: "Sarah Chen", role: "paramedic", email: "sarah@example.com", phone: "+27 82 345 6789", status: "inactive" },
  { id: "4", name: "Mike Johnson", role: "driver", email: "mike@example.com", phone: "+27 82 456 7890", status: "active" },
  { id: "5", name: "Tom Wilson", role: "driver", email: "tom@example.com", phone: "+27 82 567 8901", status: "active" },
  { id: "6", name: "Rachel Brown", role: "emt", email: "rachel@example.com", phone: "+27 82 678 9012", status: "active" },
];

export default function DriverManagementScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    paramedic: true,
    driver: false,
    emt: false,
  });

  const toggleGroup = (role: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [role]: !prev[role],
    }));
  };

  const groupedMembers = useMemo(() => {
    const filtered = searchQuery.trim()
      ? MOCK_MEMBERS.filter(
          (m) =>
            m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : MOCK_MEMBERS;

    const grouped: Record<string, Member[]> = {
      paramedic: [],
      driver: [],
      emt: [],
    };

    filtered.forEach((m) => {
      grouped[m.role].push(m);
    });

    Object.keys(grouped).forEach((role) => {
      grouped[role].sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === "active" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    });

    return grouped;
  }, [searchQuery]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "paramedic":
        return "👤";
      case "driver":
        return "👥";
      case "emt":
        return "👤";
      default:
        return "•";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "paramedic":
        return { bg: "bg-success/10", text: "text-success", accent: "border-success/40" };
      case "driver":
        return { bg: "bg-warning/10", text: "text-warning", accent: "border-warning/40" };
      case "emt":
        return { bg: "bg-primary/10", text: "text-primary", accent: "border-primary/40" };
      default:
        return { bg: "bg-muted", text: "text-muted-foreground", accent: "border-border" };
    }
  };

  const roleLabels: Record<string, string> = {
    paramedic: "Paramedics",
    driver: "Drivers",
    emt: "EMTs",
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Team Management</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-2">Driver & Crew Management</h1>
        <p className="text-sm text-muted-foreground mt-2">View and organize all crew members by role</p>
      </header>

      {/* Read-Only Notice */}
      <div className="rounded-lg bg-warning/10 border border-amber-200 text-warning p-4">
        <p className="font-semibold">📖 Read-Only View</p>
        <p className="text-sm mt-1">To add or manage crew members, use the <span className="font-semibold">User Admin</span> screen</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Accordion Groups */}
      <div className="space-y-3">
        {(["paramedic", "driver", "emt"] as const).map((role) => {
          const isExpanded = expandedGroups[role];
          const members = groupedMembers[role];
          const colors = getRoleColor(role);

          return (
            <div key={role}>
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(role)}
                className={`w-full rounded-xl border p-4 text-left font-medium transition-all flex items-center justify-between ${
                  isExpanded ? `${colors.bg} ${colors.accent} border-2` : "bg-card border"
                }`}
              >
                <span>
                  {getRoleIcon(role)} {roleLabels[role]} ({members.length})
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </button>

              {/* Group Items */}
              {isExpanded && (
                <div className="space-y-2 mt-2 ml-4">
                  {members.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No members in this group</p>
                  ) : (
                    members.map((member) => (
                      <div key={member.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              member.status === "active"
                                ? "bg-success/10 text-success"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {member.status === "active" ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{member.phone}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Section */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-bold mb-3">How to manage crew</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span className="text-success">✓</span>
            <span>Add crew members from <span className="font-semibold">User Admin</span> screen</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-success">✓</span>
            <span>View all active crew grouped by role on this screen</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-success">✓</span>
            <span>Assign crew to shifts in <span className="font-semibold">Team Status</span> screen</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
