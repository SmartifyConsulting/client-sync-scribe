import { useState, useEffect } from "react";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useHeaderTemplates } from "@/hooks/useHeaderTemplates";
import { useFooterTemplates } from "@/hooks/useFooterTemplates";
import { TemplateSectionEditor, SectionContent } from "./TemplateSectionEditor";
import {
  stripHeadingMarkup,
  renderFormattedContent as renderDocumentHtml,
} from "@/features/documents/utils/documentFormatting";
import { resolveTemplatePreviewTokens } from "@/features/documents/lib/resolveTemplatePreview";
import { getFontClass } from "./fontOptions";


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

export function TemplateForm({ initialData, onSubmit, onCancel, mode = "create" }: TemplateFormProps) {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { templates: headerTemplates } = useHeaderTemplates();
  const { templates: footerTemplates } = useFooterTemplates();
  const [selectedHeaderId, setSelectedHeaderId] = useState<string>(
    initialData?.headerTemplateId || ""
  );
  const [selectedFooterId, setSelectedFooterId] = useState<string>(
    initialData?.footerTemplateId || ""
  );

  // Auto-default to the user's `is_default` header/footer (or first available)
  // when none is linked yet, so doctors get a sensible pre-selection rather
  // than "None" on both sides.
  useEffect(() => {
    if (selectedHeaderId) return;
    if (initialData?.headerTemplateId) return;
    if (headerTemplates.length === 0) return;
    const preferred = headerTemplates.find((t) => t.is_default) ?? headerTemplates[0];
    if (preferred) setSelectedHeaderId(preferred.id);
  }, [headerTemplates, initialData?.headerTemplateId, selectedHeaderId]);

  useEffect(() => {
    if (selectedFooterId) return;
    if (initialData?.footerTemplateId) return;
    if (footerTemplates.length === 0) return;
    const preferred = footerTemplates.find((t) => t.is_default) ?? footerTemplates[0];
    if (preferred) setSelectedFooterId(preferred.id);
  }, [footerTemplates, initialData?.footerTemplateId, selectedFooterId]);

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
  });

  const [body, setBody] = useState<SectionContent>(
    initialData?.body
      ? { ...initialData.body, text: stripHeadingMarkup(initialData.body.text || "") }
      : { text: stripHeadingMarkup(initialData?.content || ""), alignment: "left" }
  );


  const selectedHeader = headerTemplates.find(t => t.id === selectedHeaderId);
  const selectedFooter = footerTemplates.find(t => t.id === selectedFooterId);

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

  // Previews show the signed-in doctor's real details; patient-scoped tokens
  // fall back to the shared quiet "___" placeholder instead of raw brackets.
  const replacePlaceholders = (text: string) =>
    resolveTemplatePreviewTokens(text, profile as any);

  const renderFormattedContent = (content: string) => renderDocumentHtml(content);


  const renderSectionPreview = (section: SectionContent | undefined | null, placeholder?: string) => {
    const hasContent = section && (section.text || section.imageUrl);
    const alignment = section?.alignment || 'left';

    return (
      <div className="min-h-[24px]" style={{ textAlign: alignment as 'left' | 'center' | 'right' }}>
        {hasContent ? (
          <>
            {section?.imageUrl && (
              <img
                src={section.imageUrl}
                alt=""
                className="max-h-12 inline-block mb-1"
              />
            )}
            {section?.text && (
              <div
                className="whitespace-pre-wrap text-sm"
                dangerouslySetInnerHTML={{ __html: renderFormattedContent(replacePlaceholders(section.text)) }}
              />
            )}
          </>
        ) : placeholder ? (
          <span className="text-xs text-gray-400">{placeholder}</span>
        ) : null}
      </div>
    );
  };

  const renderHeaderFooterPreview = (type: 'header' | 'footer') => {
    const placeholders = ['Left', 'Center', 'Right'];
    const selected = type === 'header' ? selectedHeader : selectedFooter;

    if (!selected) {
      return (
        <div className="grid grid-cols-3 gap-4">
          {placeholders.map((label) => (
            <div key={label} className="min-h-[24px] border border-dashed border-gray-300 rounded flex items-center justify-center p-2">
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      );
    }

    const sectionData = selected.section;

    // Handle both direct object and JSON parsed object
    const section = typeof sectionData === 'string'
      ? JSON.parse(sectionData)
      : sectionData as { left?: SectionContent; center?: SectionContent; right?: SectionContent } | null;

    return (
      <div className="grid grid-cols-3 gap-4">
        <div className="min-h-[24px]">{renderSectionPreview(section?.left)}</div>
        <div className="min-h-[24px]">{renderSectionPreview(section?.center)}</div>
        <div className="min-h-[24px]">{renderSectionPreview(section?.right)}</div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="grid gap-3 lg:grid-cols-2 items-start">
        {/* LEFT: Design */}
        <div className="space-y-2 min-w-0">
          {/* Name, Header & Footer — one compact row */}
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-foreground shrink-0 w-14">Name *</label>
              <Input
                placeholder="e.g., Medical Certificate"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-8 flex-1 text-sm"
              />
            </div>
            <div className="flex items-center gap-1.5">
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
                  {headerTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5">
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
                  {footerTemplates.map((template) => (
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

        {/* RIGHT: Live Preview */}
        <div className="lg:sticky lg:top-2 min-w-0">
          <div className="border border-border rounded-lg overflow-hidden bg-white">
            <div className="bg-muted/50 px-3 py-1.5 border-b border-border">
              <span className="text-xs font-medium text-foreground">Content Preview</span>
            </div>
            <div className={`p-3 min-h-[200px] ${getFontClass(selectedHeader?.font_family || selectedFooter?.font_family)}`}>
              {/* Header Preview */}
              <div className="pb-2 border-b border-gray-200 mb-2">
                {renderHeaderFooterPreview('header')}
                {!selectedHeader && (
                  <p className="text-gray-400 italic text-[10px] text-center mt-1">Select a Header template</p>
                )}
              </div>

              {/* Body Preview */}
              <div className="min-h-[100px] py-2 text-sm" style={{ textAlign: body.alignment }}>
                {body.imageUrl && (
                  <img src={body.imageUrl} alt="" className="max-h-12 inline-block mb-1.5" />
                )}
                {body.text ? (
                  <div
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: renderFormattedContent(replacePlaceholders(body.text)) }}
                  />
                ) : (
                  <p className="text-gray-400 italic text-center">Main content will appear here...</p>
                )}
              </div>

              {/* Footer Preview */}
              <div className="pt-2 border-t border-gray-200 mt-2">
                {renderHeaderFooterPreview('footer')}
                {!selectedFooter && (
                  <p className="text-gray-400 italic text-[10px] text-center mt-1">Select a Footer template</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
