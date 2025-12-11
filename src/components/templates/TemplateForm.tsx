import { useState, useCallback, useEffect, useRef } from "react";
import { Upload, X, Eye, EyeOff, Move, Bold, Italic, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Toggle } from "@/components/ui/toggle";
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
}

interface TemplateFormProps {
  initialData?: TemplateData;
  onSubmit: (template: TemplateData) => void;
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

export function TemplateForm({ initialData, onSubmit, onCancel, mode = "create" }: TemplateFormProps) {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.logoUrl || null);
  const [logoPosition, setLogoPosition] = useState(initialData?.logoPosition || { x: 50, y: 10 });
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFont, setSelectedFont] = useState(initialData?.fontFamily || "sans");
  const [showPreview, setShowPreview] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    category: initialData?.category || "",
    content: initialData?.content || "",
  });

  // Text formatting functions
  const applyFormatting = (format: 'bold' | 'italic' | 'underline') => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.content.substring(start, end);
    
    if (start === end) return; // No selection

    let wrappedText = '';
    switch (format) {
      case 'bold':
        wrappedText = `<b>${selectedText}</b>`;
        break;
      case 'italic':
        wrappedText = `<i>${selectedText}</i>`;
        break;
      case 'underline':
        wrappedText = `<u>${selectedText}</u>`;
        break;
    }

    const newContent = 
      formData.content.substring(0, start) + 
      wrappedText + 
      formData.content.substring(end);
    
    setFormData({ ...formData, content: newContent });

    // Restore cursor position after update
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + wrappedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Render content with HTML formatting
  const renderFormattedContent = (content: string) => {
    // Only allow safe HTML tags for formatting
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

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        description: initialData.description || "",
        category: initialData.category || "",
        content: initialData.content || "",
      });
      setLogoPreview(initialData.logoUrl || null);
      setLogoPosition(initialData.logoPosition || { x: 50, y: 10 });
      setSelectedFont(initialData.fontFamily || "sans");
    }
  }, [initialData]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  }, [user]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      if (user) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/template-logo-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, file, { upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from('logos')
          .getPublicUrl(fileName);

        setLogoPreview(data.publicUrl);
      }

      toast({
        title: "Logo uploaded",
        description: "Your logo has been uploaded successfully",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
  };

  // Logo drag handlers for positioning
  const handleLogoMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingLogo(true);
  };

  const handleLogoMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingLogo || !previewRef.current) return;
    
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    
    setLogoPosition({ x: Math.round(x), y: Math.round(y) });
  }, [isDraggingLogo]);

  const handleLogoMouseUp = useCallback(() => {
    setIsDraggingLogo(false);
  }, []);

  useEffect(() => {
    if (isDraggingLogo) {
      window.addEventListener('mousemove', handleLogoMouseMove);
      window.addEventListener('mouseup', handleLogoMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleLogoMouseMove);
        window.removeEventListener('mouseup', handleLogoMouseUp);
      };
    }
  }, [isDraggingLogo, handleLogoMouseMove, handleLogoMouseUp]);

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      toast({
        title: "Error",
        description: "Template name and content are required",
        variant: "destructive",
      });
      return;
    }

    onSubmit({
      id: initialData?.id,
      ...formData,
      logoUrl: logoPreview || undefined,
      logoPosition: logoPreview ? logoPosition : undefined,
      fontFamily: selectedFont,
    });
  };

  const getFontClass = (fontValue: string) => {
    return FONT_OPTIONS.find(f => f.value === fontValue)?.preview || "font-sans";
  };

  const replacePlaceholders = (content: string) => {
    return content
      .replace(/\[PracticeNumber\]/g, profile?.practice_number || "[PracticeNumber]")
      .replace(/\[DoctorNumber\]/g, profile?.doctor_number || "[DoctorNumber]")
      .replace(/\[PracticeAddress\]/g, (profile as any)?.practice_address || "[PracticeAddress]")
      .replace(/\[DoctorName\]/g, profile?.full_name || "[DoctorName]");
  };

  return (
    <div className="space-y-6">
      {/* Preview Toggle */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Template Editor</h4>
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
          <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Live Preview</span>
            {logoPreview && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Move className="h-3 w-3" />
                Drag logo to reposition
              </span>
            )}
          </div>
          <div 
            ref={previewRef}
            className="p-8 min-h-[300px] relative bg-white"
            style={{ cursor: isDraggingLogo ? 'grabbing' : 'default' }}
          >
            {/* Draggable Logo */}
            {logoPreview && (
              <div
                className={`absolute cursor-grab ${isDraggingLogo ? 'cursor-grabbing' : ''}`}
                style={{
                  left: `${logoPosition.x}%`,
                  top: `${logoPosition.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                onMouseDown={handleLogoMouseDown}
              >
                <div className="relative group">
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="max-h-16 max-w-[150px] object-contain pointer-events-none"
                    draggable={false}
                  />
                  <div className="absolute inset-0 border-2 border-dashed border-primary/50 rounded opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            )}
            
            {/* Content Preview */}
            <div className={`${logoPreview ? 'mt-20' : ''} ${getFontClass(selectedFont)}`}>
              <div 
                className="whitespace-pre-wrap text-sm text-gray-800"
                dangerouslySetInnerHTML={{ 
                  __html: renderFormattedContent(replacePlaceholders(formData.content)) || "Your template content will appear here..." 
                }}
              />
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
        <div className={`p-3 rounded-lg bg-muted/30 border border-border ${getFontClass(selectedFont)}`}>
          <p className="text-sm text-muted-foreground">Font Preview:</p>
          <p className="text-foreground">The quick brown fox jumps over the lazy dog.</p>
        </div>
      </div>

      {/* Logo Upload with Drag & Drop */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Letterhead Logo</label>
        <p className="text-xs text-muted-foreground mb-2">
          Upload a logo to appear on your letterhead. Drag and drop or click to select.
        </p>
        
        {logoPreview ? (
          <div className="relative border border-border rounded-lg p-4 bg-card">
            <div className="flex items-start gap-4">
              <div className="relative group">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="max-h-20 max-w-[200px] object-contain rounded"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={removeLogo}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground font-medium">Logo Position</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Use the preview panel above to drag and position your logo, or enter values manually.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="text-xs text-muted-foreground">X Position (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={logoPosition.x}
                      onChange={(e) => setLogoPosition({ ...logoPosition, x: Number(e.target.value) })}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Y Position (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={logoPosition.y}
                      onChange={(e) => setLogoPosition({ ...logoPosition, y: Number(e.target.value) })}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }
            `}
            onClick={() => document.getElementById('logo-upload')?.click()}
          >
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              {isUploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Drop your logo here or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG up to 5MB
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Template Content */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Template Content *</label>
        
        {/* Placeholder Instructions */}
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm font-medium text-foreground mb-2">Available Dynamic Fields</p>
          <p className="text-xs text-muted-foreground mb-2">
            Use these placeholders in your template - they will be automatically replaced with actual data when creating a document.
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

        {/* Formatting Toolbar */}
        <div className="flex items-center gap-1 p-1 border border-border rounded-md bg-muted/30 w-fit">
          <Toggle
            size="sm"
            aria-label="Bold"
            onClick={() => applyFormatting('bold')}
            className="h-8 w-8 p-0"
          >
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            aria-label="Italic"
            onClick={() => applyFormatting('italic')}
            className="h-8 w-8 p-0"
          >
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            aria-label="Underline"
            onClick={() => applyFormatting('underline')}
            className="h-8 w-8 p-0"
          >
            <Underline className="h-4 w-4" />
          </Toggle>
          <span className="text-xs text-muted-foreground ml-2 px-2 border-l border-border">
            Select text, then click to format
          </span>
        </div>

        <Textarea
          ref={contentRef}
          placeholder={`Enter your template content here...\n\nExample:\n\n[DoctorName]\nPractice #: [PracticeNumber]\n[PracticeAddress]\n\nDate: [Date]\n\nTo Whom It May Concern,\n\nThis is to certify that [PatientName] was seen at our practice...\n\nYours faithfully,\n[DoctorName]`}
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={12}
          className={`font-mono text-sm ${getFontClass(selectedFont)}`}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="flex-1">
          {mode === "edit" ? "Save Changes" : "Save"}
        </Button>
      </div>
    </div>
  );
}
