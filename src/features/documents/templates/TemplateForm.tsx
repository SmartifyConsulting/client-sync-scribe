import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useHeaderFooterTemplates } from "@/hooks/useHeaderFooterTemplates";
import { TemplateSectionEditor, SectionContent } from "./TemplateSectionEditor";
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
  const [showPreview, setShowPreview] = useState(false);
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
    initialData?.body || { text: initialData?.content || "", alignment: "left" }
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
        setBody(initialData.body);
      } else if (initialData.content) {
        setBody({ text: initialData.content, alignment: "left" });
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

  const replacePlaceholders = (text: string) => {
    let result = text
      .replace(/\[PracticeNumber\]/g, profile?.practice_number || "[PracticeNumber]")
      .replace(/\[DoctorNumber\]/g, profile?.doctor_number || "[DoctorNumber]")
      .replace(/\[PracticeAddress\]/g, (profile as any)?.practice_address || "[PracticeAddress]")
      .replace(/\[DoctorName\]/g, profile?.full_name || "[DoctorName]")
      .replace(/\[Date\]/g, new Date().toLocaleDateString());
    
    // Replace [DoctorSignature] with image tag if signature exists
    const signatureUrl = (profile as any)?.signature_url;
    if (signatureUrl) {
      result = result.replace(/\[DoctorSignature\]/g, `<img src="${signatureUrl}" alt="Signature" style="max-height: 60px; display: inline-block;" />`);
    }
    
    return result;
  };

  const renderFormattedContent = (content: string) => {
    const safeContent = content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/&lt;b&gt;/g, '<b>')
      .replace(/&lt;\/b&gt;/g, '</b>')
      .replace(/&lt;i&gt;/g, '<i>')
      .replace(/&lt;\/i&gt;/g, '</i>')
      .replace(/&lt;u&gt;/g, '<u>')
      .replace(/&lt;\/u&gt;/g, '</u>')
      .replace(/\n/g, '<br/>');
    return safeContent;
  };

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
    <div className="space-y-6">
      {/* Preview Toggle */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Content Template Editor</h4>
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
            <span className="text-sm font-medium text-foreground">Content Preview</span>
          </div>
          <div className="p-6 min-h-[300px]">
            {/* Header Preview */}
            <div className="pb-4 border-b border-gray-200 mb-4">
              {renderHeaderFooterPreview('header')}
              {!selectedHeaderFooter && (
                <p className="text-gray-400 italic text-xs text-center mt-2">Select a Header/Footer template below</p>
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
      )}

      {/* Template Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Template Name *</label>
        <Input
          placeholder="e.g., Medical Certificate, Referral Letter"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Description</label>
        <Input
          placeholder="Brief description of when to use this template"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      {/* Header/Footer Template Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Header & Footer Template</label>
        <Select 
          value={selectedHeaderFooterId || "none"} 
          onValueChange={(val) => setSelectedHeaderFooterId(val === "none" ? "" : val)}
        >
          <SelectTrigger>
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
        <p className="text-xs text-muted-foreground">
          This header and footer will be used when creating documents with this template.
        </p>
      </div>

      {/* Dynamic Fields Info */}
      <div className="p-3 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm font-medium text-foreground mb-2">Available Dynamic Fields</p>
        <p className="text-xs text-muted-foreground mb-2">
          Drag a placeholder into the content area, or click to copy. They are replaced with real data when documents are created.
        </p>
        <div className="flex flex-wrap gap-2">
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
              className="text-xs bg-primary/10 text-primary px-2 py-1 rounded cursor-grab active:cursor-grabbing select-none hover:bg-primary/20"
              title="Drag into content or click to copy"
            >
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
  );
}
