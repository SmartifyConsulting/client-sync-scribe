import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { TemplateSectionEditor, SectionContent } from "./TemplateSectionEditor";
import { resolveTemplatePreviewTokens } from "@/features/documents/lib/resolveTemplatePreview";
import { renderFormattedContent as renderDocumentHtml } from "@/features/documents/utils/documentFormatting";
import { FONT_OPTIONS, getFontClass } from "./fontOptions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-2">
      {/* Preview Toggle */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-foreground">Header & Footer Template</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="gap-1.5 h-7 text-xs"
        >
          {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showPreview ? "Hide Preview" : "Show Preview"}
        </Button>
      </div>

      {/* Live Preview Panel */}
      {showPreview && (
        <div className="border border-border rounded-lg overflow-hidden bg-white">
          <div className="bg-muted/50 px-3 py-1.5 border-b border-border">
            <span className="text-xs font-medium text-foreground">Live Preview</span>
          </div>
          <div className={`p-3 min-h-[160px] ${getFontClass(selectedFont)}`}>
            {/* Header Preview */}
            <div className="grid grid-cols-3 gap-2 pb-2 border-b border-gray-200 mb-2">
              <div>{renderSectionPreview(header.left)}</div>
              <div>{renderSectionPreview(header.center)}</div>
              <div>{renderSectionPreview(header.right)}</div>
            </div>

            {/* Content Placeholder */}
            <div className="min-h-[60px] py-2 flex items-center justify-center">
              <p className="text-gray-400 italic text-xs">Document content will appear here...</p>
            </div>

            {/* Footer Preview */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200 mt-2">
              <div>{renderSectionPreview(footer.left)}</div>
              <div>{renderSectionPreview(footer.center)}</div>
              <div>{renderSectionPreview(footer.right)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Name & Font — one compact row */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-foreground shrink-0 w-14">Name *</label>
          <Input
            placeholder="e.g., Practice Letterhead"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

      {/* Dynamic Fields Info */}
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

      {/* HEADER TEMPLATE CARD — saved together with the Footer Template Card below as
          one Letterhead; both are applied by default whenever a content template
          selects this Letterhead. */}
      <Card className="border-border">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs font-semibold text-foreground">
            Header Template <span className="font-normal text-muted-foreground">(Left, Center, Right)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-2 px-3 pb-3">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Left</label>
            <TemplateSectionEditor
              value={header.left}
              onChange={(v) => setHeader({ ...header, left: v })}
              placeholder="Logo, practice name..."
              rows={2}
              compact
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Center</label>
            <TemplateSectionEditor
              value={header.center}
              onChange={(v) => setHeader({ ...header, center: v })}
              placeholder="Title, heading..."
              rows={2}
              compact
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Right</label>
            <TemplateSectionEditor
              value={header.right}
              onChange={(v) => setHeader({ ...header, right: v })}
              placeholder="Date, reference..."
              rows={2}
              compact
            />
          </div>
        </CardContent>
      </Card>

      {/* FOOTER TEMPLATE CARD */}
      <Card className="border-border">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs font-semibold text-foreground">
            Footer Template <span className="font-normal text-muted-foreground">(Left, Center, Right)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-2 px-3 pb-3">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Left</label>
            <TemplateSectionEditor
              value={footer.left}
              onChange={(v) => setFooter({ ...footer, left: v })}
              placeholder="Practice details..."
              rows={2}
              compact
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Center</label>
            <TemplateSectionEditor
              value={footer.center}
              onChange={(v) => setFooter({ ...footer, center: v })}
              placeholder="Page number..."
              rows={2}
              compact
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Right</label>
            <TemplateSectionEditor
              value={footer.right}
              onChange={(v) => setFooter({ ...footer, right: v })}
              placeholder="Contact info..."
              rows={2}
              compact
            />
          </div>
        </CardContent>
      </Card>
      <p className="text-[10px] text-muted-foreground -mt-1">
        Saving this Letterhead applies both the Header Card and Footer Card together by default wherever it's selected.
      </p>

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
  );
}