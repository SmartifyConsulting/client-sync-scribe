import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { TemplateSectionEditor, SectionContent } from "./TemplateSectionEditor";
import { resolveTemplatePreviewTokens } from "@/features/documents/lib/resolveTemplatePreview";
import { renderFormattedContent as renderDocumentHtml } from "@/features/documents/utils/documentFormatting";
import { FONT_OPTIONS, getFontClass } from "./fontOptions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FooterTemplateFormData {
  id?: string;
  name: string;
  description: string;
  fontFamily?: string;
  section: {
    left: SectionContent;
    center: SectionContent;
    right: SectionContent;
  };
}

interface FooterTemplateFormProps {
  initialData?: FooterTemplateFormData;
  onSubmit: (template: FooterTemplateFormData) => void;
  onCancel: () => void;
  mode?: "create" | "edit";
}

const defaultSectionContent = (): SectionContent => ({
  text: "",
  alignment: "left",
  imageUrl: undefined,
});

export function FooterTemplateForm({ initialData, onSubmit, onCancel, mode = "create" }: FooterTemplateFormProps) {
  const { toast } = useToast();
  const { profile } = useProfile();
  const [selectedFont, setSelectedFont] = useState(initialData?.fontFamily || "sans");
  const [showPreview, setShowPreview] = useState(false);

  const [name, setName] = useState(initialData?.name || "");

  const [section, setSection] = useState({
    left: initialData?.section?.left || defaultSectionContent(),
    center: initialData?.section?.center || { ...defaultSectionContent(), alignment: "center" as const },
    right: initialData?.section?.right || { ...defaultSectionContent(), alignment: "right" as const },
  });

  const replacePlaceholders = (text: string) => resolveTemplatePreviewTokens(text, profile as any);
  const renderFormattedContent = (content: string) => renderDocumentHtml(content);

  const renderSectionPreview = (s: SectionContent) => (
    <div style={{ textAlign: s.alignment }}>
      {s.imageUrl && <img src={s.imageUrl} alt="" className="max-h-12 inline-block mb-1" />}
      {s.text && (
        <div
          className="whitespace-pre-wrap text-sm"
          dangerouslySetInnerHTML={{ __html: renderFormattedContent(replacePlaceholders(s.text)) }}
        />
      )}
    </div>
  );

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: "Error", description: "Footer template name is required", variant: "destructive" });
      return;
    }
    onSubmit({
      id: initialData?.id,
      name,
      description: initialData?.description || "",
      fontFamily: selectedFont,
      section,
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-foreground">Footer Template</h4>
        <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="gap-1.5 h-7 text-xs">
          {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showPreview ? "Hide Preview" : "Show Preview"}
        </Button>
      </div>

      {showPreview && (
        <div className="border border-border rounded-lg overflow-hidden bg-white">
          <div className="bg-muted/50 px-3 py-1.5 border-b border-border">
            <span className="text-xs font-medium text-foreground">Live Preview</span>
          </div>
          <div className={`p-3 grid grid-cols-3 gap-2 ${getFontClass(selectedFont)}`}>
            <div>{renderSectionPreview(section.left)}</div>
            <div>{renderSectionPreview(section.center)}</div>
            <div>{renderSectionPreview(section.right)}</div>
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-foreground shrink-0 w-14">Name *</label>
          <Input
            placeholder="e.g., Practice Footer"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 flex-1 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-foreground shrink-0 w-14">Font</label>
          <Select value={selectedFont} onValueChange={setSelectedFont}>
            <SelectTrigger className="h-8 flex-1 text-sm">
              <SelectValue placeholder="Select a font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={font.value} value={font.value}>
                  <span className={font.preview}>{font.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="px-2 py-1.5 rounded-lg bg-muted/50 border border-border">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] font-medium text-muted-foreground mr-0.5">Fields:</span>
          <code className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">[DoctorName]</code>
          <code className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">[DoctorSignature]</code>
          <code className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">[PracticeNumber]</code>
          <code className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">[DoctorNumber]</code>
          <code className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">[PracticeAddress]</code>
          <code className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">[Date]</code>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 p-2 border border-border rounded-lg bg-card">
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Left</label>
          <TemplateSectionEditor
            value={section.left}
            onChange={(v) => setSection({ ...section, left: v })}
            placeholder="Practice details..."
            rows={3}
            compact
          />
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Center</label>
          <TemplateSectionEditor
            value={section.center}
            onChange={(v) => setSection({ ...section, center: v })}
            placeholder="Page number..."
            rows={3}
            compact
          />
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Right</label>
          <TemplateSectionEditor
            value={section.right}
            onChange={(v) => setSection({ ...section, right: v })}
            placeholder="Contact info..."
            rows={3}
            compact
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} className="flex-1 h-8">
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="flex-1 h-8">
          {mode === "edit" ? "Save Changes" : "Save Footer Template"}
        </Button>
      </div>
    </div>
  );
}
