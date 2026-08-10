import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { usePracticeAssistant } from "@/hooks/usePracticeAssistant";
import { AssignTaskDialog } from "@/components/tasks/AssignTaskDialog";

interface PracticePatient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  user_id: string;
}

/**
 * Practice Management Assistant view of the practice doctors' patients.
 * Administrative details only — no clinical records are shown here.
 */
export default function PracticePatients() {
  const { doctors, loading: practiceLoading } = usePracticeAssistant();
  const [patients, setPatients] = useState<PracticePatient[]>([]);
  const [query, setQuery] = useState("");
  const [taskPatientId, setTaskPatientId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (practiceLoading) return;
    (async () => {
      const doctorIds = doctors.map((d) => d.user_id);
      if (!doctorIds.length) {
        setPatients([]);
        return;
      }
      const { data } = await supabase
        .from("patients")
        .select("id, name, email, phone, user_id")
        .in("user_id", doctorIds)
        .order("name", { ascending: true });
      setPatients((data || []) as PracticePatient[]);
    })();
  }, [doctors, practiceLoading]);

  const doctorName = useMemo(
    () => new Map(doctors.map((d) => [d.user_id, d.full_name || "Doctor"])),
    [doctors],
  );

  const filtered = patients.filter((p) =>
    p.name?.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Practice Patients</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Administrative view of the practice doctors' patients. Clinical records are not shown.
      </p>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search patients…"
          className="pl-9"
        />
      </div>

      <Card className="divide-y divide-border">
        {filtered.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">No patients found.</div>
        )}
        {filtered.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{p.name}</span>
                <Badge variant="outline" className="shrink-0">
                  {doctorName.get(p.user_id) || "Doctor"}
                </Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {[p.email, p.phone].filter(Boolean).join(" · ") || "No contact details"}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 shrink-0"
              onClick={() => {
                setTaskPatientId(p.id);
                setDialogOpen(true);
              }}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Task
            </Button>
          </div>
        ))}
      </Card>

      <AssignTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patientId={taskPatientId}
      />
    </div>
  );
}
