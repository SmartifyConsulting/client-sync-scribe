import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { TemplateSectionEditor, SectionContent } from "./TemplateSectionEditor";
import { resolveTemplatePreviewTokens } from "@/features/documents/lib/resolveTemplatePreview";
import { renderFormattedContent as renderDocumentHtml } from "@/features/documents/utils/documentFormatting";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface HeaderFooterTemplateData {
  id?: string;
  name: string;
  description: string;
  fontFamily?: string;
  header: {
    left: SectionContent;
    center: SectionContent;
    right: SectionContent;
  };
  footer: {
    left: SectionContent;
    center: SectionContent;
    right: SectionContent;
  };
}

interface HeaderFooterTemplateFormProps {
  initialData?: HeaderFooterTemplateData;
  onSubmit: (template: HeaderFooterTemplateData) => void;
  onCancel: () => void;
  mode?: "create" | "edit";
}

const FONT_OPTIONS = [
  { value: "sans", label: "DM Sans (Default)", preview: "font-sans" },
  { value: "roboto", label: "Roboto", preview: "font-roboto" },
  { value: "open-sans", label: "Open Sans", preview: "font-open-sans" },
  { value: "lora", label: "Lora", preview: "font-lora" },
  { value: "merriweather", label: "Merriweather", preview: "font-merriweather" },
  { value: "playfair", label: "Playfair Display", preview: "font-playfair" },
  { value: "source-serif", label: "Source Serif", preview: "font-source-serif" },
  { value: "rockwell", label: "Rockwell", preview: "font-rockwell" },
];

const defaultSectionContent = (): SectionContent => ({
  text: "",
  alignment: "left",
  imageUrl: undefined,
});

export function HeaderFooterTemplateForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  mode = "create" 
}: HeaderFooterTemplateFormProps) {
  const { toast } = useToast();
  const { profile } = useProfile();
  const [selectedFont, setSelectedFont] = useState(initialData?.fontFamily || "sans");
  const [showPreview, setShowPreview] = useState(false);
  
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
  });

  const [header, setHeader] = useState({
    left: initialData?.header?.left || defaultSectionContent(),
    center: initialData?.header?.center || { ...defaultSectionContent(), alignment: 'center' as const },
    right: initialData?.header?.right || { ...defaultSectionContent(), alignment: 'right' as const },
  });

  const [footer, setFooter] = useState({
    left: initialData?.footer?.left || defaultSectionContent(),
    center: initialData?.footer?.center || { ...defaultSectionContent(), alignment: 'center' as const },
    right: initialData?.footer?.right || { ...defaultSectionContent(), alignment: 'right' as const },
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        description: initialData.description || "",
      });
      setSelectedFont(initialData.fontFamily || "sans");
      if (initialData.header) setHeader(initialData.header);
      if (initialData.footer) setFooter(initialData.footer);
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
      fontFamily: selectedFont,
      header,
      footer,
    });
  };

  const getFontClass = (fontValue: string) => {
    return FONT_OPTIONS.find(f => f.value === fontValue)?.preview || "font-sans";
  };

  // Previews resolve the signed-in doctor's real details (name, numbers,
  // signature). Tokens without context render as a quiet "___".
  const replacePlaceholders = (text: string) =>
    resolveTemplatePreviewTokens(text, profile as any);

  const renderFormattedContent = (content: string) => renderDocumentHtml(content);

  const renderSectionPreview = (section: SectionContent) => {
    return (
      <div style={{ textAlign: section.alignment }}>
        {section.imageUrl && (
          <img src={section.imageUrl} alt="" className="max-h-12 inline-block mb-1" />
        )}
        {section.text && (
          <div 
            className="whitespace-pre-wrap text-sm"
            dangerouslySetInnerHTML={{ __html: renderFormattedContent(replacePlaceholders(section.text)) }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Preview Toggle */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Header & Footer Template</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="gap-2"
        >
          {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showPreview ? "Hide Preview" : "Show Preview"}
        </Button>
      </div>

      {/* Live Preview Panel */}
      {showPreview && (
        <div className="border border-border rounded-lg overflow-hidden bg-white">
          <div className="bg-muted/50 px-4 py-2 border-b border-border">
            <span className="text-sm font-medium text-foreground">Live Preview</span>
          </div>
          <div className={`p-6 min-h-[300px] ${getFontClass(selectedFont)}`}>
            {/* Header Preview */}
            <div className="grid grid-cols-3 gap-4 pb-4 border-b border-gray-200 mb-4">
              <div>{renderSectionPreview(header.left)}</div>
              <div>{renderSectionPreview(header.center)}</div>
              <div>{renderSectionPreview(header.right)}</div>
            </div>
            
            {/* Content Placeholder */}
            <div className="min-h-[100px] py-4 flex items-center justify-center">
              <p className="text-gray-400 italic text-sm">Document content will appear here...</p>
            </div>
            
            {/* Footer Preview */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 mt-4">
              <div>{renderSectionPreview(footer.left)}</div>
              <div>{renderSectionPreview(footer.center)}</div>
              <div>{renderSectionPreview(footer.right)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Template Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Template Name *</label>
        <Input
          placeholder="e.g., Practice Letterhead, Official Header"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Description</label>
        <Input
          placeholder="Brief description of this header/footer style"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      {/* Font Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Document Font</label>
        <Select value={selectedFont} onValueChange={setSelectedFont}>
          <SelectTrigger>
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

      {/* Dynamic Fields Info */}
      <div className="p-3 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm font-medium text-foreground mb-2">Available Dynamic Fields</p>
        <p className="text-xs text-muted-foreground mb-2">
          Use these placeholders - they will be replaced with actual data when creating documents.
        </p>
        <div className="flex flex-wrap gap-2">
          <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">[DoctorName]</code>
          <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">[DoctorSignature]</code>
          <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">[PracticeNumber]</code>
          <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">[DoctorNumber]</code>
          <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">[PracticeAddress]</code>
          <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">[Date]</code>
        </div>
      </div>

      {/* HEADER SECTION */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground">Header</h4>
          <span className="text-xs text-muted-foreground">(3 columns: Left, Center, Right)</span>
        </div>
        <div className="grid grid-cols-3 gap-3 p-4 border border-border rounded-lg bg-card">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Left</label>
            <TemplateSectionEditor
              value={header.left}
              onChange={(v) => setHeader({ ...header, left: v })}
              placeholder="Logo, practice name..."
              rows={2}
              compact
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Center</label>
            <TemplateSectionEditor
              value={header.center}
              onChange={(v) => setHeader({ ...header, center: v })}
              placeholder="Title, heading..."
              rows={2}
              compact
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Right</label>
            <TemplateSectionEditor
              value={header.right}
              onChange={(v) => setHeader({ ...header, right: v })}
              placeholder="Date, reference..."
              rows={2}
              compact
            />
          </div>
        </div>
      </div>

      {/* FOOTER SECTION */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground">Footer</h4>
          <span className="text-xs text-muted-foreground">(3 columns: Left, Center, Right)</span>
        </div>
        <div className="grid grid-cols-3 gap-3 p-4 border border-border rounded-lg bg-card">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Left</label>
            <TemplateSectionEditor
              value={footer.left}
              onChange={(v) => setFooter({ ...footer, left: v })}
              placeholder="Practice details..."
              rows={2}
              compact
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Center</label>
            <TemplateSectionEditor
              value={footer.center}
              onChange={(v) => setFooter({ ...footer, center: v })}
              placeholder="Page number..."
              rows={2}
              compact
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Right</label>
            <TemplateSectionEditor
              value={footer.right}
              onChange={(v) => setFooter({ ...footer, right: v })}
              placeholder="Contact info..."
              rows={2}
              compact
            />
          </div>
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
  );
}