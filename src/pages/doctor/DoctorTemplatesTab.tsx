import { useMemo, useState } from "react";
import { FileText, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTemplates } from "@/hooks/useTemplates";
import { DocumentEditor } from "@/components/documents/DocumentEditor";
import { documentTypeBadgeClass } from "@/lib/documentTypeColors";
import { cn } from "@/lib/utils";

const extractPlaceholders = (content: string): string[] => [
  ...new Set((content.match(/\[([^\]]+)\]/g) || []).map((m) => m.slice(1, -1))),
];

export default function DoctorTemplatesTab() {
  const { templates, loading } = useTemplates();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<(typeof templates)[number] | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        (t.description || "").toLowerCase().includes(term),
    );
  }, [templates, q]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-5xl">
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search templates…"
          className="pl-8 text-xs"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-xs text-muted-foreground">
          No templates found.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {filtered.map((t) => (
            <Card key={t.id} className="p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium flex items-center gap-1.5 truncate">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  {t.name}
                </p>
                {t.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {t.description}
                  </p>
                )}
                <span
                  className={cn(
                    "inline-block mt-2 text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full",
                    documentTypeBadgeClass(t.category || t.name),
                  )}
                >
                  {t.category || "General"}
                </span>
              </div>
              <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={() => setSelected(t)}>
                Use
              </Button>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <DocumentEditor
          template={{
            id: selected.id,
            name: selected.name,
            description: selected.description || "",
            content: selected.content,
            placeholders: extractPlaceholders(selected.content),
            category: selected.category || undefined,
          }}
          onClose={() => setSelected(null)}
          onSave={() => setSelected(null)}
        />
      )}
    </div>
  );
}
