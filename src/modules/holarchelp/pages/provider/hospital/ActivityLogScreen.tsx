import { format } from "date-fns";
import { History, Loader2 } from "lucide-react";
import { useProviderAccess } from "../../../components/ProviderGate";
import { useHospitalActivityLog } from "../../../hooks/useAdmissionChartEntries";
import { ListGroupToolbar } from "@/components/common/ListGroupToolbar";

const ACTION_LABEL: Record<string, string> = {
  added: "added",
  edited: "edited",
  deleted: "deleted",
  "clocked in": "clocked in",
};

/** Read-only audit trail of every action taken on a hospital's admission
 *  charts (vitals, notes, medications, clock-ins, etc.) — nobody, including
 *  admins, can edit or delete entries here; it's a pure record of what
 *  happened, by whom, and when. */
export default function ActivityLogScreen() {
  const { providerId, loading: providerLoading } = useProviderAccess();
  const { rows, loading } = useHospitalActivityLog(providerId);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Activity Log</h1>
        <p className="text-muted-foreground text-xs">
          A read-only trail of every action taken on patient charts — nothing here can be edited or deleted.
        </p>
      </header>

      {providerLoading || loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <ListGroupToolbar
          storageKey="hospital-activity-log"
          items={rows.map((r) => ({
            item: r,
            date: r.created_at,
            patient: r.patient_name,
            search: `${r.actor_name} ${r.action} ${r.detail ?? ""} ${r.patient_name ?? ""}`,
          }))}
          searchPlaceholder="Search activity..."
          emptyLabel="No activity recorded yet."
          renderItem={(r) => (
            <div key={r.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
              <History className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold text-foreground">{r.actor_name}</span>{" "}
                  <span className="text-muted-foreground">{ACTION_LABEL[r.action] || r.action}</span>
                  {r.patient_name && (
                    <>
                      {" "}for <span className="font-medium text-foreground">{r.patient_name}</span>
                    </>
                  )}
                  {r.section && <span className="text-muted-foreground"> · {r.section}</span>}
                </p>
                {r.detail && <p className="text-xs text-muted-foreground truncate">{r.detail}</p>}
                <p className="text-[10px] text-muted-foreground">{format(new Date(r.created_at), "dd MMM yyyy, HH:mm")}</p>
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}
