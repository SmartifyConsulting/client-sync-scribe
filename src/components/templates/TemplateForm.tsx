import { useState, useCallback, useEffect } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    category: initialData?.category || "",
    content: initialData?.content || "",
  });

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

  return (
    <div className="space-y-6">
      {/* Doctor Information Display */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <h4 className="text-sm font-medium text-foreground mb-3">Doctor Information</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Practice Number:</span>
            <p className="font-medium text-foreground">
              {profile?.practice_number || (
                <span className="text-amber-600">Not set - Update in Settings</span>
              )}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Doctor Registration Number:</span>
            <p className="font-medium text-foreground">
              {profile?.doctor_number || (
                <span className="text-amber-600">Not set - Update in Settings</span>
              )}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <span className="text-muted-foreground">Practice Address:</span>
          <p className="font-medium text-foreground">
            {(profile as any)?.practice_address || (
              <span className="text-amber-600">Not set - Update in Settings</span>
            )}
          </p>
        </div>
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

      {/* Template Details */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground">Template Name *</label>
          <Input
            placeholder="e.g., Progress Report"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Category</label>
          <Input
            placeholder="e.g., Report, Letter, Plan"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Description</label>
        <Input
          placeholder="Brief description of the template"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Content *</label>
        <p className="text-xs text-muted-foreground mb-2">
          Use [PlaceholderName] for dynamic fields. Available: [ClientName], [SessionDate], [PracticeNumber], [DoctorNumber]
        </p>
        <Textarea
          placeholder={`Example template:\n\nLETTERHEAD\n==========\nPractice Number: [PracticeNumber]\nDoctor Number: [DoctorNumber]\n\nDear [ClientName],\n\nYour content here...`}
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={10}
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
