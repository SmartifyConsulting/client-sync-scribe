import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function HolarcHelpIncidents() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("holarchelp_incidents" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setItems((data as any) ?? []));
  }, [user]);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-extrabold">Incident history</h1>
      <ul className="mt-4 space-y-2">
        {items.length === 0 && <li className="rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground">No incidents yet</li>}
        {items.map((i) => (
          <li key={i.id}>
            <Link to={`/patient/holarchelp/incident/${i.id}`} className="flex items-center justify-between rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
              <div>
                <p className="font-semibold">{new Date(i.created_at).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{i.resolved_at ? `Resolved ${new Date(i.resolved_at).toLocaleString()}` : "In progress"}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${["completed","cancelled"].includes(i.status) ? "bg-secondary text-primary" : "bg-sos/10 text-sos"}`}>
                {(i.status ?? "").toUpperCase().replace(/_/g, " ")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
