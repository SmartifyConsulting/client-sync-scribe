import { useState, useCallback } from "react";
import { Upload, X, Image as ImageIcon, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TemplateFormProps {
  onSubmit: (template: {
    name: string;
    description: string;
    category: string;
    content: string;
    logoUrl?: string;
    logoPosition?: { x: number; y: number };
  }) => void;
  onCancel: () => void;
}

export function TemplateForm({ onSubmit, onCancel }: TemplateFormProps) {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoPosition, setLogoPosition] = useState({ x: 50, y: 10 });
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    content: "",
  });

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
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase storage
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
      ...formData,
      logoUrl: logoPreview || undefined,
      logoPosition: logoPreview ? logoPosition : undefined,
    });
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
            <span className="text-muted-foreground">Doctor Number:</span>
            <p className="font-medium text-foreground">
              {profile?.doctor_number || (
                <span className="text-amber-600">Not set - Update in Settings</span>
              )}
            </p>
          </div>
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
          className="font-mono text-sm"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="flex-1">
          Create Template
        </Button>
      </div>
    </div>
  );
}
