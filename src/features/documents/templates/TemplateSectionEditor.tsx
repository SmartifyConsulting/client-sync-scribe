import { useState, useRef, useCallback } from "react";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Upload, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SectionContent {
  text: string;
  alignment: 'left' | 'center' | 'right';
  imageUrl?: string;
  fontSize?: number; // in pixels
  fontFamily?: string;
}

interface TemplateSectionEditorProps {
  value: SectionContent;
  onChange: (value: SectionContent) => void;
  placeholder?: string;
  rows?: number;
  showImageUpload?: boolean;
  compact?: boolean;
  label?: string;
  showFontControls?: boolean;
}

const FONT_FAMILIES = [
  { value: "sans", label: "DM Sans" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Monospace" },
  { value: "roboto", label: "Roboto" },
  { value: "open-sans", label: "Open Sans" },
];

const FONT_SIZES = [
  { value: 10, label: "10px" },
  { value: 12, label: "12px" },
  { value: 14, label: "14px" },
  { value: 16, label: "16px" },
  { value: 18, label: "18px" },
  { value: 20, label: "20px" },
  { value: 24, label: "24px" },
];

export function TemplateSectionEditor({
  value,
  onChange,
  placeholder = "Enter content...",
  rows = 3,
  showImageUpload = true,
  compact = false,
  label,
  showFontControls = false,
}: TemplateSectionEditorProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const applyFormatting = (format: 'bold' | 'italic' | 'underline') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.text.substring(start, end);

    if (start === end) return;

    let wrappedText = '';
    switch (format) {
      case 'bold':
        wrappedText = `{BOLD}${selectedText}{/BOLD}`;
        break;
      case 'italic':
        wrappedText = `{ITALIC}${selectedText}{/ITALIC}`;
        break;
      case 'underline':
        wrappedText = `{UNDERLINE}${selectedText}{/UNDERLINE}`;
        break;
    }

    const newText = value.text.substring(0, start) + wrappedText + value.text.substring(end);
    onChange({ ...value, text: newText });

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + wrappedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

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

    // Placeholder token drag (text/plain) - insert at cursor
    const token = e.dataTransfer.getData("text/plain");
    if (token && token.startsWith("[") && token.endsWith("]")) {
      const textarea = textareaRef.current;
      const pos = textarea?.selectionStart ?? value.text.length;
      const next = value.text.slice(0, pos) + token + value.text.slice(pos);
      onChange({ ...value, text: next });
      setTimeout(() => {
        textarea?.focus();
        const newPos = pos + token.length;
        textarea?.setSelectionRange(newPos, newPos);
      }, 0);
      return;
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  }, [user, value, onChange]);

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
        description: "Please upload an image file",
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
      if (user) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/template-section-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('logos').getPublicUrl(fileName);
        onChange({ ...value, imageUrl: data.publicUrl });
      } else {
        // For non-authenticated preview, use data URL
        const reader = new FileReader();
        reader.onload = (e) => {
          onChange({ ...value, imageUrl: e.target?.result as string });
        };
        reader.readAsDataURL(file);
      }

      toast({ title: "Image uploaded", description: "Image added to section" });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    onChange({ ...value, imageUrl: undefined });
  };

  const inputId = `section-image-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="space-y-3">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}

      {/* Font Controls */}
      {showFontControls && (
        <div className="flex items-center gap-3 p-2 border border-border rounded-md bg-muted/20">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground block mb-1">Font Family</label>
            <Select value={value.fontFamily || "sans"} onValueChange={(font) => onChange({ ...value, fontFamily: font })}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground block mb-1">Font Size</label>
            <Select value={(value.fontSize || 14).toString()} onValueChange={(size) => onChange({ ...value, fontSize: parseInt(size) })}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_SIZES.map(s => (
                  <SelectItem key={s.value} value={s.value.toString()}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className={`flex items-center gap-1 p-1 border border-border rounded-md bg-muted/30 ${compact ? 'flex-wrap' : ''}`}>
        <Toggle
          size="sm"
          aria-label="Bold"
          onClick={() => applyFormatting('bold')}
          className="h-7 w-7 p-0"
        >
          <Bold className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          aria-label="Italic"
          onClick={() => applyFormatting('italic')}
          className="h-7 w-7 p-0"
        >
          <Italic className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          aria-label="Underline"
          onClick={() => applyFormatting('underline')}
          className="h-7 w-7 p-0"
        >
          <Underline className="h-3.5 w-3.5" />
        </Toggle>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        <Toggle
          size="sm"
          aria-label="Align Left"
          pressed={value.alignment === 'left'}
          onPressedChange={() => onChange({ ...value, alignment: 'left' })}
          className="h-7 w-7 p-0"
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          aria-label="Align Center"
          pressed={value.alignment === 'center'}
          onPressedChange={() => onChange({ ...value, alignment: 'center' })}
          className="h-7 w-7 p-0"
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          aria-label="Align Right"
          pressed={value.alignment === 'right'}
          onPressedChange={() => onChange({ ...value, alignment: 'right' })}
          className="h-7 w-7 p-0"
        >
          <AlignRight className="h-3.5 w-3.5" />
        </Toggle>

        {showImageUpload && (
          <>
            <div className="w-px h-5 bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => document.getElementById(inputId)?.click()}
              disabled={isUploading}
            >
              <Image className="h-3.5 w-3.5" />
            </Button>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </>
        )}
      </div>

      {/* Image Preview */}
      {value.imageUrl && (
        <div className="relative inline-block">
          <img
            src={value.imageUrl}
            alt="Section image"
            className="max-h-16 max-w-[120px] object-contain rounded border border-border"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-5 w-5"
            onClick={removeImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Image Drop Zone (when no image) */}
      {showImageUpload && !value.imageUrl && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`
            border border-dashed rounded p-2 text-center transition-colors cursor-pointer text-xs
            ${isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-border/50 hover:border-primary/50'
            }
          `}
          onClick={() => document.getElementById(inputId)?.click()}
        >
          {isUploading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto" />
          ) : (
            <span className="text-muted-foreground flex items-center justify-center gap-1">
              <Upload className="h-4 w-4" />
              Drop image
            </span>
          )}
        </div>
      )}

      {/* Text Area */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          placeholder={placeholder}
          rows={rows}
          className="text-sm resize-none"
          style={{ textAlign: value.alignment, fontSize: value.fontSize ? `${value.fontSize}px` : undefined }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("text/plain")) e.preventDefault();
          }}
          onDrop={(e) => {
            const token = e.dataTransfer.getData("text/plain");
            if (!token || !token.startsWith("[") || !token.endsWith("]")) return;
            e.preventDefault();
            const ta = textareaRef.current;
            const pos = ta?.selectionStart ?? value.text.length;
            const next = value.text.slice(0, pos) + token + value.text.slice(pos);
            onChange({ ...value, text: next });
            setTimeout(() => {
              ta?.focus();
              const newPos = pos + token.length;
              ta?.setSelectionRange(newPos, newPos);
            }, 0);
          }}
        />
        {value.text && (
          <div className="absolute -bottom-6 right-0 text-xs text-muted-foreground">
            Drag placeholders or paste with Ctrl+V
          </div>
        )}
      </div>
    </div>
  );
}
