import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Loader2, Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDocuments } from "@/hooks/useDocuments";
import { format } from "date-fns";

export default function DoctorDocumentsTab() {
  const { documents, loading } = useDocuments();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter(
      (d) =>
        d.name?.toLowerCase().includes(term) ||
        d.patient_name?.toLowerCase().includes(term) ||
        d.template_name?.toLowerCase().includes(term),
    );
  }, [documents, q]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search documents…"
          className="pl-8"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No documents yet.
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {filtered.map((doc) => {
            const target = doc.patient_id
              ? `/patients/${doc.patient_id}?tab=documents&doc=${doc.id}`
              : `/documents`;
            return (
              <li key={doc.id}>
                <Link
                  to={target}
                  className="flex items-start gap-3 rounded-lg border-2 border-primary/30 bg-card p-3 transition-colors hover:bg-accent/40"
                >
                  <FileText className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{doc.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {doc.patient_name && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {doc.patient_name}
                        </span>
                      )}
                      {doc.template_name && <span>{doc.template_name}</span>}
                      <span>{format(new Date(doc.updated_at || doc.created_at), "d MMM yyyy")}</span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
