import { useState, useEffect } from "react";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useHeaderFooterTemplates } from "@/hooks/useHeaderFooterTemplates";
import { TemplateSectionEditor, SectionContent } from "./TemplateSectionEditor";
import {
  stripHeadingMarkup,
  renderFormattedContent as renderDocumentHtml,
} from "@/features/documents/utils/documentFormatting";
import { resolveTemplatePreviewTokens } from "@/features/documents/lib/resolveTemplatePreview";


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
  headerFooterTemplateId?: string;
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
  const { templates: headerFooterTemplates } = useHeaderFooterTemplates();
  const [selectedHeaderFooterId, setSelectedHeaderFooterId] = useState<string>(
    initialData?.headerFooterTemplateId || ""
  );

  // Auto-default to the user's `is_default` letterhead (or first available) when
  // none is linked yet. This way doctors with multiple letterheads still get
  // a sensible pre-selection rather than "None".
  useEffect(() => {
    if (selectedHeaderFooterId) return;
    if (initialData?.headerFooterTemplateId) return;
    if (headerFooterTemplates.length === 0) return;
    const preferred =
      headerFooterTemplates.find((t) => (t as any).is_default) ??
      headerFooterTemplates[0];
    if (preferred) setSelectedHeaderFooterId(preferred.id);
  }, [headerFooterTemplates, initialData?.headerFooterTemplateId, selectedHeaderFooterId]);
  
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
  });

  const [body, setBody] = useState<SectionContent>(
    initialData?.body
      ? { ...initialData.body, text: stripHeadingMarkup(initialData.body.text || "") }
      : { text: stripHeadingMarkup(initialData?.content || ""), alignment: "left" }
  );


  const selectedHeaderFooter = headerFooterTemplates.find(t => t.id === selectedHeaderFooterId);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        description: initialData.description || "",
      });
      setSelectedHeaderFooterId(initialData.headerFooterTemplateId || "");
      
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
      headerFooterTemplateId: selectedHeaderFooterId || undefined,
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
    
    if (!selectedHeaderFooter) {
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

    const sectionData = type === 'header' 
      ? selectedHeaderFooter.header 
      : selectedHeaderFooter.footer;
    
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
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground">Content Template Editor</h4>

      <div className="grid gap-4 lg:grid-cols-2 items-start">
        {/* LEFT: Design */}
        <div className="space-y-3 min-w-0">
          {/* Template Name, Description & Header/Footer — compact single-row layout */}
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-foreground shrink-0 w-20">Name *</label>
              <Input
                placeholder="e.g., Medical Certificate"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-9 flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-foreground shrink-0 w-20">Description</label>
              <Input
                placeholder="When to use this template"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="h-9 flex-1"
              />
            </div>
            {(() => {
              const match = [...(body.text?.matchAll(/font-size:\s*(\d+)pt/gi) ?? [])];
              if (match.length === 0) return null;
              const counts = new Map<string, number>();
              for (const m of match) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
              const detectedSize = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
              return (
                <span className="flex items-center whitespace-nowrap text-xs text-muted-foreground">
                  Written in <span className="ml-1 font-medium text-foreground">{detectedSize}pt</span>
                </span>
              );
            })()}
          </div>

          {/* Header/Footer Template Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-foreground shrink-0 w-20">Letterhead</label>
            <div className="flex-1">
              <Select
                value={selectedHeaderFooterId || "none"}
                onValueChange={(val) => setSelectedHeaderFooterId(val === "none" ? "" : val)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select a header/footer template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {headerFooterTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dynamic Fields Info */}
          <div className="px-3 py-2 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs font-medium text-foreground mb-1.5">
              Dynamic fields <span className="font-normal text-muted-foreground">— click or drag into the content below</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
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
                  className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded cursor-grab active:cursor-grabbing select-none hover:bg-primary/20"
                  title="Drag into the content area, or click to copy"
                >
                  <GripVertical className="h-3 w-3 opacity-70" />
                  {token}
                </code>
              ))}
            </div>

          </div>

          {/* CONTENT SECTION */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-foreground">Content</h4>
              <span className="text-xs text-muted-foreground">(Main body of the document)</span>
            </div>
            <div className="p-4 border border-border rounded-lg bg-card">
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
                rows={12}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1">
              {mode === "edit" ? "Save Changes" : "Save Template"}
            </Button>
          </div>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="lg:sticky lg:top-3 min-w-0">
          <div className="border border-border rounded-lg overflow-hidden bg-white">
            <div className="bg-muted/50 px-4 py-2 border-b border-border">
              <span className="text-sm font-medium text-foreground">Content Preview</span>
            </div>
            <div className="p-6 min-h-[300px]">
              {/* Header Preview */}
              <div className="pb-4 border-b border-gray-200 mb-4">
                {renderHeaderFooterPreview('header')}
                {!selectedHeaderFooter && (
                  <p className="text-gray-400 italic text-xs text-center mt-2">Select a Header/Footer template</p>
                )}
              </div>

              {/* Body Preview */}
              <div className="min-h-[150px] py-4" style={{ textAlign: body.alignment }}>
                {body.imageUrl && (
                  <img src={body.imageUrl} alt="" className="max-h-16 inline-block mb-2" />
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
              <div className="pt-4 border-t border-gray-200 mt-4">
                {renderHeaderFooterPreview('footer')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
