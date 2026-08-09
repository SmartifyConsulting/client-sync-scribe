import { useState, useEffect } from "react";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useHeaderFooterTemplates, mergeHeaderFooterTemplates } from "@/hooks/useHeaderFooterTemplates";
import { TemplateSectionEditor, SectionContent } from "./TemplateSectionEditor";
import { stripHeadingMarkup } from "@/features/documents/utils/documentFormatting";
import { resolveTemplatePreviewTokens } from "@/features/documents/lib/resolveTemplatePreview";
import { getFontFamilyCss } from "./fontOptions";
import { DocumentCanvas } from "./DocumentCanvas";


import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TemplateData {
  id?: string;
  name: string;
  description: string;
  category: string;
  content: string;
  logoUrl?: string;
  logoPosition?: { x: number; y: number };
  fontFamily?: string;
  body?: SectionContent;
  headerTemplateId?: string;
  footerTemplateId?: string;
}

interface TemplateFormProps {
  initialData?: TemplateData;
  onSubmit: (template: TemplateData) => void;
  onCancel: () => void;
  mode?: "create" | "edit";
}

const defaultSectionContent = (): SectionContent => ({
  text: "",
  alignment: "left",
  imageUrl: undefined,
});

/** True when a letterhead's header/footer section actually has content —
 *  used to only offer letterheads with a filled Header in the Header
 *  dropdown, and likewise for Footer, instead of listing every letterhead
 *  in both regardless of which sections were actually filled in. */
function sectionHasContent(section: any): boolean {
  if (!section) return false;
  return !!(
    section.left?.text || section.left?.imageUrl ||
    section.center?.text || section.center?.imageUrl ||
    section.right?.text || section.right?.imageUrl
  );
}

/** The seeded letterhead is literally called "Header and Footer", which reads
 *  as a non-existent template inside the Header / Footer dropdowns. Show it as
 *  "Default Header" / "Default Footer" instead; custom letterheads keep their
 *  own name. */
function optionLabel(name: string, section: "header" | "footer"): string {
  if ((name || "").trim().toLowerCase() === "header and footer") {
    return section === "header" ? "Default Header" : "Default Footer";
  }
  return name;
}

export function TemplateForm({ initialData, onSubmit, onCancel, mode = "create" }: TemplateFormProps) {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { templates: headerFooterTemplates } = useHeaderFooterTemplates();
  const headerTemplateOptions = headerFooterTemplates.filter((t) => sectionHasContent(t.header));
  const footerTemplateOptions = headerFooterTemplates.filter((t) => sectionHasContent(t.footer));
  const [selectedHeaderId, setSelectedHeaderId] = useState<string>(
    initialData?.headerTemplateId || ""
  );
  const [selectedFooterId, setSelectedFooterId] = useState<string>(
    initialData?.footerTemplateId || ""
  );
  // Once the doctor deliberately picks "None" we stop re-applying the default.
  const [headerCleared, setHeaderCleared] = useState(false);
  const [footerCleared, setFooterCleared] = useState(false);

  // Always pre-select the default letterhead (or the first one that has content
  // in that section) whenever nothing is selected — new templates and existing
  // templates saved without a header/footer link alike.
  useEffect(() => {
    if (!selectedHeaderId && !headerCleared && headerTemplateOptions.length > 0) {
      const preferred = headerTemplateOptions.find((t) => (t as any).is_default) ?? headerTemplateOptions[0];
      setSelectedHeaderId(preferred.id);
    }
    if (!selectedFooterId && !footerCleared && footerTemplateOptions.length > 0) {
      const preferred = footerTemplateOptions.find((t) => (t as any).is_default) ?? footerTemplateOptions[0];
      setSelectedFooterId(preferred.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerFooterTemplates, selectedHeaderId, selectedFooterId, headerCleared, footerCleared]);


  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
  });

  const [body, setBody] = useState<SectionContent>(
    initialData?.body
      ? { ...initialData.body, text: stripHeadingMarkup(initialData.body.text || "") }
      : { text: stripHeadingMarkup(initialData?.content || ""), alignment: "left" }
  );


  const selectedHeader = headerFooterTemplates.find(t => t.id === selectedHeaderId);
  const selectedFooter = headerFooterTemplates.find(t => t.id === selectedFooterId);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        description: initialData.description || "",
      });
      setSelectedHeaderId(initialData.headerTemplateId || "");
      setSelectedFooterId(initialData.footerTemplateId || "");

      if (initialData.body) {
        setBody({ ...initialData.body, text: stripHeadingMarkup(initialData.body.text || "") });
      } else if (initialData.content) {
        setBody({ text: stripHeadingMarkup(initialData.content), alignment: "left" });
      }

    }
  }, [initialData]);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    onSubmit({
      id: initialData?.id,
      name: formData.name,
      description: formData.description,
      category: "",
      content: body.text,
      body,
      headerTemplateId: selectedHeaderId || undefined,
      footerTemplateId: selectedFooterId || undefined,
    });
  };

  // Preview shows the signed-in doctor's real details; patient-scoped tokens
  // fall back to the shared quiet "___" placeholder instead of raw brackets.
  const replacePlaceholders = (text: string) =>
    resolveTemplatePreviewTokens(text, profile as any);

  const previewHeaderFooter = mergeHeaderFooterTemplates(selectedHeader ?? null, selectedFooter ?? null);
  const previewFontFamily = getFontFamilyCss(selectedHeader?.font_family ?? selectedFooter?.font_family);

  return (
    <div className="space-y-2">
      <div className="grid gap-3 lg:grid-cols-2 items-start">
        {/* LEFT: Design */}
        <div className="space-y-2 min-w-0">
          {/* Name, Header & Footer — one row, Name wider than the two dropdowns */}
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 flex-[2] min-w-0">
              <label className="text-xs font-medium text-foreground shrink-0 w-14">Name *</label>
              <Input
                placeholder="e.g., Medical Certificate"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-8 flex-1 text-sm"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <label className="text-xs font-medium text-foreground shrink-0 w-14">Header</label>
              <Select
                value={selectedHeaderId || "none"}
                onValueChange={(val) => setSelectedHeaderId(val === "none" ? "" : val)}
              >
                <SelectTrigger className="h-8 flex-1 text-sm">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {headerTemplateOptions.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <label className="text-xs font-medium text-foreground shrink-0 w-14">Footer</label>
              <Select
                value={selectedFooterId || "none"}
                onValueChange={(val) => setSelectedFooterId(val === "none" ? "" : val)}
              >
                <SelectTrigger className="h-8 flex-1 text-sm">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {footerTemplateOptions.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dynamic Fields Info */}
          <div className="px-2 py-1.5 rounded-lg bg-muted/50 border border-border">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] font-medium text-muted-foreground mr-0.5">Fields:</span>
              {[
                "[PatientName]","[DoctorName]","[DoctorSignature]","[PracticeNumber]",
                "[DoctorNumber]","[PracticeAddress]","[Date]","[PatientAddress]","[PatientDOB]",
              ].map((token) => (
                <code
                  key={token}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", token);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => { navigator.clipboard?.writeText(token); }}
                  className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded cursor-grab active:cursor-grabbing select-none hover:bg-primary/20"
                  title="Drag into the content area, or click to copy"
                >
                  <GripVertical className="h-2.5 w-2.5 opacity-70" />
                  {token}
                </code>
              ))}
            </div>
          </div>

          {/* CONTENT SECTION */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-foreground">Content</h4>
              {(() => {
                const match = [...(body.text?.matchAll(/font-size:\s*(\d+)pt/gi) ?? [])];
                if (match.length === 0) return null;
                const counts = new Map<string, number>();
                for (const m of match) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
                const detectedSize = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
                return (
                  <span className="text-[10px] text-muted-foreground">
                    Written in <span className="font-medium text-foreground">{detectedSize}pt</span>
                  </span>
                );
              })()}
            </div>
            <div className="p-2 border border-border rounded-lg bg-card">
              <TemplateSectionEditor
                value={body}
                onChange={setBody}
                placeholder="Enter the main content of your template here...

Example:
To Whom It May Concern,

This is to certify that [PatientName] was examined at our practice on [Date].

[Additional details here...]

Yours faithfully,
[DoctorName]"
                rows={8}
                showImageUpload={false}
                fontFamily={previewFontFamily}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onCancel} className="flex-1 h-8">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1 h-8">
              {mode === "edit" ? "Save Changes" : "Save Template"}
            </Button>
          </div>
        </div>

        {/* RIGHT: Live Preview — identical rendering to the full-screen Preview
            dialog (DocumentCanvas), just embedded and compact. */}
        <div className="lg:sticky lg:top-2 min-w-0">
          <div className="border border-border rounded-lg overflow-hidden bg-white">
            <div className="bg-muted/50 px-3 py-1.5 border-b border-border">
              <span className="text-xs font-medium text-foreground">Content Preview</span>
            </div>
            <div className="min-h-[200px] max-h-[500px] overflow-y-auto">
              <DocumentCanvas
                content={replacePlaceholders(body.text)}
                headerFooter={previewHeaderFooter}
                fontFamily={selectedHeader?.font_family ?? selectedFooter?.font_family}
                compact
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
