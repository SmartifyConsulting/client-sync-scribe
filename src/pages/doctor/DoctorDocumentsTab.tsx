import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Loader2, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDocuments } from "@/hooks/useDocuments";
import { format } from "date-fns";
import { SampleBadge } from "@/components/patients/SampleBadge";
import { isSamplePatient } from "@/lib/samplePatients";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

export default function DoctorDocumentsTab() {
  const { documents, loading } = useDocuments();
  const [q, setQ] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [q]);

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
        <>
          <ul className="divide-y rounded-lg border bg-card">
            {filtered.slice(0, visibleCount).map((doc) => {
              const target = doc.patient_id
                ? `/patients/${doc.patient_id}?tab=documents&doc=${doc.id}`
                : `/documents`;
              return (
                <li key={doc.id}>
                  <Link
                    to={target}
                    className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-accent"
                  >
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="flex-1 truncate text-sm font-medium text-foreground">{doc.name}</span>
                    {doc.patient_name && (
                      <span className={cn("hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground min-w-0 truncate max-w-[180px]", isSamplePatient({ name: doc.patient_name }) && "italic")}>
                        <User className="h-3 w-3" />
                        {doc.patient_name}
                        {isSamplePatient({ name: doc.patient_name }) && <SampleBadge />}
                      </span>
                    )}
                    {doc.template_name && (
                      <span className="hidden md:inline text-xs text-muted-foreground truncate max-w-[160px]">
                        {doc.template_name}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(doc.updated_at || doc.created_at), "d MMM yyyy")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {visibleCount < filtered.length && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                Load more ({visibleCount} of {filtered.length})
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
