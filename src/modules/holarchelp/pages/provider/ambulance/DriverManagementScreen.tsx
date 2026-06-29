import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
    paramedic: t("driverManagement.roles.paramedics"),
    driver: t("driverManagement.roles.drivers"),
    emt: t("driverManagement.roles.emts"),
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("driverManagement.header.subtitle")}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{t("driverManagement.header.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("driverManagement.header.description")}</p>
      </div>

      <div className="rounded bg-warning/10 border border-amber-200 text-warning p-2.5">
        <p className="text-xs font-semibold">📖 {t("driverManagement.readOnly.label")}</p>
        <p className="text-xs mt-0.5">{t("driverManagement.readOnly.description")}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder={t("driverManagement.search.placeholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>

      <div className="space-y-2">
        {(["paramedic", "driver", "emt"] as const).map((role) => {
          const isExpanded = expandedGroups[role];
          const members = groupedMembers[role];
          const colors = getRoleColor(role);

          return (
            <div key={role}>
              <button
                onClick={() => toggleGroup(role)}
                className={`w-full rounded border p-2 text-left font-medium transition-all flex items-center justify-between text-xs ${
                  isExpanded ? `${colors.bg} ${colors.accent} border-2` : "bg-card border"
                }`}
              >
                <span>
                  {getRoleIcon(role)} {roleLabels[role]} ({members.length})
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {isExpanded && (
                <div className="space-y-1 mt-1.5 ml-3">
                  {members.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">{t("driverManagement.messages.noMembers")}</p>
                  ) : (
                    members.map((member) => (
                      <div key={member.id} className="rounded border border-border bg-card p-2 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-xs truncate">{member.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap ${
                              member.status === "active"
                                ? "bg-success/10 text-success"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {member.status === "active" ? t("driverManagement.status.active") : t("driverManagement.status.inactive")}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{member.phone}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded border bg-card p-2.5 space-y-1.5">
        <h3 className="font-semibold text-xs">{t("driverManagement.helpSection.title")}</h3>
        <ul className="space-y-1 text-[11px]">
          <li className="flex items-center gap-1.5">
            <span className="text-success">✓</span>
            <span>{t("driverManagement.helpSection.step1")}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-success">✓</span>
            <span>{t("driverManagement.helpSection.step2")}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-success">✓</span>
            <span>{t("driverManagement.helpSection.step3")}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
