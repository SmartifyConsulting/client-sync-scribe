import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Loader2, Search, User, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  SECTION_TRIGGER_CLASS,
  SECTION_FRAME_CLASS,
  SECTION_ITEM_CLASS,
  SectionCountPill,
  DATE_BUCKETS,
  dateBucketFor,
  type DateBucketKey,
} from "@/components/ui/section-accordion";
import { useDocuments } from "@/hooks/useDocuments";
import { format } from "date-fns";
import { SampleBadge } from "@/components/patients/SampleBadge";
import { isSamplePatient } from "@/lib/samplePatients";
import { cn } from "@/lib/utils";

type DocRow = ReturnType<typeof useDocuments>["documents"][number];

function getSurname(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[parts.length - 1] || "").toUpperCase();
}

function DocumentCard({ doc }: { doc: DocRow }) {
  const target = doc.patient_id
    ? `/patients/${doc.patient_id}?tab=documents&doc=${doc.id}`
    : `/documents`;
  const sample = !!doc.patient_name && isSamplePatient({ name: doc.patient_name });

  return (
    <Link to={target}>
      <Card className="p-3 hover:bg-accent/40 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium truncate flex items-center gap-1.5 text-xs">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              {doc.name}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
              {doc.patient_name && (
                <span className={cn("flex items-center gap-1", sample && "italic")}>
                  <User className="h-3 w-3" />
                  {doc.patient_name}
                  {sample && <SampleBadge />}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(doc.updated_at || doc.created_at), "d MMM yyyy, HH:mm")}
              </span>
            </div>
          </div>
          {doc.template_name && (
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full shrink-0 bg-muted text-muted-foreground max-w-[160px] truncate">
              {doc.template_name}
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}

export default function DoctorDocumentsTab() {
  const { documents, loading } = useDocuments();
  const [q, setQ] = useState("");
  const [groupMode, setGroupMode] = useState<"date" | "patient">("date");

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

  const groupedByDate = useMemo(() => {
    const out: Record<DateBucketKey, DocRow[]> = {
      today: [],
      week: [],
      month: [],
      older: [],
    };
    for (const d of filtered) out[dateBucketFor(d.updated_at || d.created_at)].push(d);
    return out;
  }, [filtered]);

  const groupedByPatient = useMemo(() => {
    const map = new Map<string, DocRow[]>();
    for (const d of filtered) {
      const name = d.patient_name || "No patient";
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(d);
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      getSurname(a).localeCompare(getSurname(b)),
    );
  }, [filtered]);

  const defaultOpen =
    groupMode === "date"
      ? [(DATE_BUCKETS.find((b) => groupedByDate[b.key].length > 0) ?? DATE_BUCKETS[0]).key]
      : groupedByPatient.length > 0
        ? [groupedByPatient[0][0]]
        : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search documents…"
            className="pl-8 text-xs"
          />
        </div>
        <ToggleGroup
          type="single"
          value={groupMode}
          onValueChange={(v) => v && setGroupMode(v as "date" | "patient")}
          size="sm"
          variant="outline"
        >
          <ToggleGroupItem value="date" className="text-xs px-3">
            Date
          </ToggleGroupItem>
          <ToggleGroupItem value="patient" className="text-xs px-3">
            Patient
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-xs text-muted-foreground">
          No documents yet.
        </div>
      ) : (
        <Accordion
          key={groupMode}
          type="multiple"
          defaultValue={defaultOpen}
          className={SECTION_FRAME_CLASS}
        >
          {groupMode === "date"
            ? DATE_BUCKETS.map((b) => {
                const rows = groupedByDate[b.key];
                return (
                  <AccordionItem key={b.key} value={b.key} className={SECTION_ITEM_CLASS}>
                    <AccordionTrigger className={SECTION_TRIGGER_CLASS}>
                      <div className="flex items-center justify-between w-full pr-2">
                        <span className="text-xs font-medium">{b.label}</span>
                        <SectionCountPill count={rows.length} />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pt-3 pb-3">
                      {rows.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-2 py-3">
                          No documents in this period.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {rows.map((d) => (
                            <li key={d.id}>
                              <DocumentCard doc={d} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })
            : groupedByPatient.map(([name, rows]) => (
                <AccordionItem key={name} value={name} className={SECTION_ITEM_CLASS}>
                  <AccordionTrigger className={SECTION_TRIGGER_CLASS}>
                    <div className="flex items-center justify-between w-full pr-2">
                      <span className="text-xs font-medium">{name}</span>
                      <SectionCountPill count={rows.length} />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pt-3 pb-3">
                    <ul className="space-y-2">
                      {rows.map((d) => (
                        <li key={d.id}>
                          <DocumentCard doc={d} />
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
        </Accordion>
      )}
    </div>
  );
}
