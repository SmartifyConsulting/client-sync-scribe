import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Loader2, Search, User, Clock, Plus, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  SECTION_TRIGGER_ALWAYS_GREEN_CLASS,
  SECTION_CONTENT_CLASS,
  SECTION_FRAME_CLASS,
  SECTION_ITEM_CLASS,
  SectionCountPill,
  DATE_BUCKETS,
  dateBucketFor,
  type DateBucketKey,
} from "@/components/ui/section-accordion";
import { useDocuments } from "@/hooks/useDocuments";
import { useTemplates } from "@/hooks/useTemplates";
import { DocumentEditor } from "@/components/documents/DocumentEditor";
import { DocumentPreviewWithLetterhead } from "@/features/documents/components/DocumentPreviewWithLetterhead";
import { UploadDocumentDialog } from "@/features/documents/UploadDocumentDialog";
import { MailboxIntakeAddress } from "@/components/documents/MailboxIntakeAddress";
import { format } from "date-fns";
import { SampleBadge } from "@/components/patients/SampleBadge";
import { isSamplePatient } from "@/lib/samplePatients";
import { documentTypeBadgeClass } from "@/lib/documentTypeColors";
import { cn } from "@/lib/utils";

type DocRow = ReturnType<typeof useDocuments>["documents"][number];
type GroupMode = "date" | "type" | "patient";

function getSurname(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[parts.length - 1] || "").toUpperCase();
}

function DocumentCard({ doc, onPreview }: { doc: DocRow; onPreview: (doc: DocRow) => void }) {
  const sample = !!doc.patient_name && isSamplePatient({ name: doc.patient_name });

  return (
    <button type="button" className="w-full text-left" onClick={() => onPreview(doc)}>
      <Card className="p-3 hover:bg-accent/40 transition-colors">

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium truncate flex items-center gap-1.5 text-xs">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              {doc.name}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
              {doc.patient_name && (
                <span className="flex items-center gap-1">
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
            <span
              className={cn(
                "text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full shrink-0 max-w-[160px] truncate",
                documentTypeBadgeClass(doc.template_name),
              )}
            >
              {doc.template_name}
            </span>
          )}
        </div>
      </Card>
    </button>
  );
}

export default function DoctorDocumentsTab() {
  // Documents where the doctor is themself the patient are covered by the My Profile
  // view now, so this list is just every practice document — no owner filter needed.
  const { documents, loading, fetchDocuments } = useDocuments(undefined, { allOwners: true });
  const { templates } = useTemplates();
  const [q, setQ] = useState("");
  const [groupMode, setGroupMode] = useState<GroupMode>("type");
  const [selectedTemplate, setSelectedTemplate] = useState<(typeof templates)[number] | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocRow | null>(null);

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

  const groupedByType = useMemo(() => {
    const map = new Map<string, DocRow[]>();
    for (const d of filtered) {
      const type = d.template_name || "Other";
      if (!map.has(type)) map.set(type, []);
      map.get(type)!.push(d);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const groups: { key: string; label: string; rows: DocRow[] }[] =
    groupMode === "date"
      ? DATE_BUCKETS.filter((b) => groupedByDate[b.key].length > 0).map((b) => ({
          key: b.key,
          label: b.label,
          rows: groupedByDate[b.key],
        }))
      : (groupMode === "type" ? groupedByType : groupedByPatient).map(([name, rows]) => ({
          key: name,
          label: name,
          rows,
        }));

  const defaultOpen = groups.length ? [groups[0].key] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-5xl">
      <MailboxIntakeAddress />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search documents…"
            className="pl-8 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={groupMode}
            onValueChange={(v) => v && setGroupMode(v as GroupMode)}
            size="sm"
            variant="outline"
          >
            <ToggleGroupItem value="date" className="text-xs px-3">
              Date
            </ToggleGroupItem>
            <ToggleGroupItem value="type" className="text-xs px-3">
              Type
            </ToggleGroupItem>
            <ToggleGroupItem value="patient" className="text-xs px-3">
              Patient
            </ToggleGroupItem>
          </ToggleGroup>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5 text-xs">
                <Plus className="h-4 w-4" />
                Add Document
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
              {templates.length === 0 ? (
                <DropdownMenuItem disabled className="text-xs">
                  No templates available
                </DropdownMenuItem>
              ) : (
                templates.map((t) => (
                  <DropdownMenuItem
                    key={t.id}
                    className="text-xs"
                    onSelect={() => setSelectedTemplate(t)}
                  >
                    {t.name}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Upload File
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
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
          {groups.map((g) => (
            <AccordionItem key={g.key} value={g.key} className={SECTION_ITEM_CLASS}>
              <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}>
                <div className="flex items-center justify-between w-full pr-2">
                  <span className="text-xs font-medium">{g.label}</span>
                  <SectionCountPill count={g.rows.length} />
                </div>
              </AccordionTrigger>
              <AccordionContent className={SECTION_CONTENT_CLASS}>
                {groupMode === "date" ? (
                  <Accordion type="multiple" className="divide-y divide-border">
                    {Array.from(
                      g.rows.reduce((map, d) => {
                        const name = d.patient_name || "No patient";
                        if (!map.has(name)) map.set(name, []);
                        map.get(name)!.push(d);
                        return map;
                      }, new Map<string, DocRow[]>()),
                    )
                      .sort(([a], [b]) => getSurname(a).localeCompare(getSurname(b)))
                      .map(([patientName, rows]) => (
                        <AccordionItem key={patientName} value={patientName} className="border-0">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                            <div className="flex items-center justify-between w-full pr-2">
                              <span className="text-sm font-semibold flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-primary" />
                                {patientName}
                              </span>
                              <SectionCountPill count={rows.length} />
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-0 pb-0">
                            <div className="divide-y divide-border">
                              {rows.map((d) => (
                                <div key={d.id} className="px-4 py-3">
                                  <DocumentCard doc={d} onPreview={setPreviewDoc} />
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                  </Accordion>
                ) : (
                  <ul className="space-y-2">
                    {g.rows.map((d) => (
                      <li key={d.id}>
                        <DocumentCard doc={d} onPreview={setPreviewDoc} />
                      </li>
                    ))}
                  </ul>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {selectedTemplate && (
        <DocumentEditor
          template={{
            id: selectedTemplate.id,
            name: selectedTemplate.name,
            description: selectedTemplate.description || "",
            content: selectedTemplate.content,
            placeholders: [
              ...new Set(
                (selectedTemplate.content.match(/\[([^\]]+)\]/g) || []).map((m) => m.slice(1, -1)),
              ),
            ],

            category: selectedTemplate.category || undefined,
          }}
          onClose={() => setSelectedTemplate(null)}
          onSave={() => setSelectedTemplate(null)}
        />
      )}

      {previewDoc && (
        <DocumentPreviewWithLetterhead
          document={previewDoc as any}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={fetchDocuments}
      />
    </div>
  );
}
