import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { TemplateSectionEditor, SectionContent } from "./TemplateSectionEditor";

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
  const [showPreview, setShowPreview] = useState(false);
  
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
  });

  const [body, setBody] = useState<SectionContent>(
    initialData?.body || { text: initialData?.content || "", alignment: "left" }
  );

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        description: initialData.description || "",
      });
      
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
    });
  };

  const replacePlaceholders = (text: string) => {
    return text
      .replace(/\[PracticeNumber\]/g, profile?.practice_number || "[PracticeNumber]")
      .replace(/\[DoctorNumber\]/g, profile?.doctor_number || "[DoctorNumber]")
      .replace(/\[PracticeAddress\]/g, (profile as any)?.practice_address || "[PracticeAddress]")
      .replace(/\[DoctorName\]/g, profile?.full_name || "[DoctorName]")
      .replace(/\[Date\]/g, new Date().toLocaleDateString());
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

  const renderSectionPreview = (section: SectionContent) => {
    return (
      <div style={{ textAlign: section.alignment }}>
        {section.imageUrl && (
          <img 
            src={section.imageUrl} 
            alt="" 
            className="max-h-12 inline-block mb-1"
          />
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
          <div className="p-6 min-h-[200px]">
            {/* Header placeholder */}
            <div className="pb-4 border-b border-dashed border-gray-200 mb-4">
              <p className="text-gray-400 italic text-xs text-center">Header will appear here (from Header/Footer template)</p>
            </div>
            
            {/* Body Preview */}
            <div className="min-h-[150px] py-4">
              {renderSectionPreview(body)}
              {!body.text && !body.imageUrl && (
                <p className="text-gray-400 italic">Main content will appear here...</p>
              )}
            </div>
            
            {/* Footer placeholder */}
            <div className="pt-4 border-t border-dashed border-gray-200 mt-4">
              <p className="text-gray-400 italic text-xs text-center">Footer will appear here (from Header/Footer template)</p>
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

      {/* Dynamic Fields Info */}
      <div className="p-3 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm font-medium text-foreground mb-2">Available Dynamic Fields</p>
        <p className="text-xs text-muted-foreground mb-2">
          Use these placeholders - they will be replaced with actual data when creating documents.
        </p>
        <div className="flex flex-wrap gap-2">
          <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">[PatientName]</code>
          <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">[DoctorName]</code>
          <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">[PracticeNumber]</code>
          <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">[DoctorNumber]</code>
          <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">[PracticeAddress]</code>
          <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">[Date]</code>
          <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">[PatientAddress]</code>
          <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">[PatientDOB]</code>
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