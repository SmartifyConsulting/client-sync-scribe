import { useState, useRef, useCallback, useEffect } from "react";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Upload, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
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
}

interface TemplateSectionEditorProps {
  value: SectionContent;
  onChange: (value: SectionContent) => void;
  placeholder?: string;
  rows?: number;
  showImageUpload?: boolean;
  compact?: boolean;
}

const FONT_FAMILIES = [
  { label: "Sora", value: "Sora, sans-serif" },
  { label: "Manrope", value: "Manrope, sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Garamond", value: "Garamond, Baskerville, serif" },
  { label: "Calibri", value: "Calibri, Candara, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
];

const FONT_SIZES = ["10", "11", "12", "14", "16", "18", "20", "24"];

/** True when the stored value is legacy plain text rather than HTML. */
const looksLikeHtml = (text: string) => /<[a-z][\s\S]*>/i.test(text);

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Convert whatever is stored into HTML suitable for the editable surface. */
const toEditorHtml = (text: string) => {
  if (!text) return "";
  if (looksLikeHtml(text)) return text;
  return escapeHtml(text).replace(/\n/g, "<br>");
};

export function TemplateSectionEditor({
  value,
  onChange,
  placeholder = "Enter content...",
  rows = 3,
  showImageUpload = true,
  compact = false,
}: TemplateSectionEditorProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // Shown selected in the toolbar and applied as the editor's base style, so the
  // content weight/size is obvious up front instead of silently falling back to
  // the browser default (which often looks lighter/heavier than the preview).
  const [currentFont, setCurrentFont] = useState(FONT_FAMILIES[0].value);
  const [currentSize, setCurrentSize] = useState(FONT_SIZES[2]);

  // Keep the editable surface in sync with external value changes without
  // clobbering the caret while the user is typing.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    const html = toEditorHtml(value.text || "");
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [value.text]);

  const emit = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    onChange({ ...value, text: el.innerHTML });
  }, [onChange, value]);

  const runCommand = (command: string, arg?: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {
      /* not supported everywhere — safe to ignore */
    }
    document.execCommand(command, false, arg);
    emit();
  };

  /** Select the whole editor when nothing is selected, so toolbar always applies. */
  const ensureSelection = () => {
    const el = editorRef.current;
    if (!el) return;
    const selection = window.getSelection();
    const hasSelectionInside =
      selection &&
      selection.rangeCount > 0 &&
      !selection.isCollapsed &&
      el.contains(selection.anchorNode);
    if (hasSelectionInside) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const applyFormatting = (format: 'bold' | 'italic' | 'underline') => {
    const el = editorRef.current;
    if (!el) return;
    ensureSelection();
    el.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    // Toggle based on whether the selection is already wrapped in this exact tag —
    // not execCommand's queryCommandState, which goes by computed CSS font-weight
    // and can see text as "already bold" (e.g. inherited from a heading) and strip
    // it instead of adding emphasis.
    const tagName = format === "bold" ? "STRONG" : format === "italic" ? "EM" : "U";
    const ancestor = range.commonAncestorContainer;
    const ancestorEl = (ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentElement : (ancestor as Element)) ?? undefined;
    const existingTag = ancestorEl?.closest(tagName.toLowerCase());

    if (existingTag && el.contains(existingTag)) {
      const parent = existingTag.parentNode;
      while (existingTag.firstChild) parent?.insertBefore(existingTag.firstChild, existingTag);
      parent?.removeChild(existingTag);
    } else {
      const fragment = range.extractContents();
      const wrapper = document.createElement(tagName);
      wrapper.appendChild(fragment);
      range.insertNode(wrapper);

      const newRange = document.createRange();
      newRange.selectNodeContents(wrapper);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }

    emit();
  };

  const applyFontFamily = (family: string) => {
    setCurrentFont(family);
    ensureSelection();
    runCommand("fontName", family);
  };

  const applyFontSize = (size: string) => {
    setCurrentSize(size);
    const el = editorRef.current;
    if (!el) return;
    ensureSelection();
    el.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    // Extract the selection, strip any font-size it already carries (e.g. from a
    // previous size change or pasted content — otherwise that inline style keeps
    // winning and the new size never visibly applies), then wrap it in a single
    // span carrying the exact pt size we want. This avoids execCommand("fontSize"),
    // which only supports sizes 1-7 and can leave stray <font> fragments behind.
    const fragment = range.extractContents();
    const span = document.createElement("span");
    span.appendChild(fragment);
    span.querySelectorAll<HTMLElement>('[style*="font-size"]').forEach((node) => {
      node.style.fontSize = "";
    });
    span.style.fontSize = `${size}pt`;
    range.insertNode(span);

    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(newRange);

    emit();
  };

  const insertToken = (token: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand("insertText", false, token);
    emit();
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

    const embedLocally = () =>
      new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          onChange({ ...value, imageUrl: e.target?.result as string });
          resolve();
        };
        reader.onerror = () => resolve();
        reader.readAsDataURL(file);
      });

    try {
      // Storage policies key off the *authenticated session* id, which can differ
      // from the app-level user (profile switching / impersonation). Always build
      // the upload path from the live session.
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData?.user?.id;

      if (authUserId) {
        const rawExt = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const fileExt = rawExt || 'png';
        const fileName = `${authUserId}/template-section-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, file, { upsert: true, contentType: file.type || undefined });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          // Storage refused it — still let the user place the image inline.
          await embedLocally();
          toast({
            title: "Image added (not stored)",
            description: uploadError.message || "Storage upload failed; the image was embedded locally.",
          });
          return;
        }

        const { data } = supabase.storage.from('logos').getPublicUrl(fileName);
        onChange({ ...value, imageUrl: data.publicUrl });
      } else {
        // No active session — embed as a data URL
        await embedLocally();
        toast({
          title: "Image added (not stored)",
          description: "You are not signed in, so the image was embedded locally.",
        });
        return;
      }


      toast({ title: "Image uploaded", description: "Image added to section" });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error?.message || "Failed to upload image",
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
  const minHeight = Math.max(rows, 3) * 24;

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className={`flex items-center gap-1 p-1 border border-border rounded-md bg-muted/30 ${compact ? 'flex-wrap' : ''}`}>
        <Select value={currentFont} onValueChange={applyFontFamily}>
          <SelectTrigger className="h-7 w-[130px] text-xs" aria-label="Font">
            <SelectValue placeholder="Font" />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((font) => (
              <SelectItem key={font.value} value={font.value} className="text-xs">
                <span style={{ fontFamily: font.value }}>{font.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentSize} onValueChange={applyFontSize}>
          <SelectTrigger className="h-7 w-[72px] text-xs" aria-label="Font size">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size} value={size} className="text-xs">
                {size} pt
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-px h-5 bg-border mx-1" />

        <Toggle
          size="sm"
          aria-label="Bold"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormatting('bold')}
          className="h-7 w-7 p-0"
        >
          <Bold className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          aria-label="Italic"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormatting('italic')}
          className="h-7 w-7 p-0"
        >
          <Italic className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          aria-label="Underline"
          onMouseDown={(e) => e.preventDefault()}
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
            border-2 border-dashed rounded-lg p-3 text-center transition-colors cursor-pointer text-xs
            ${isDragging
              ? 'border-primary bg-primary/10'
              : 'border-primary/50 bg-primary/5 hover:border-primary hover:bg-primary/10'
            }
          `}
          onClick={() => document.getElementById(inputId)?.click()}
        >
          {isUploading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto" />
          ) : (
            <span className="text-primary font-medium flex items-center justify-center gap-1.5">
              <Image className="h-4 w-4" />
              Drop image or click to upload
            </span>
          )}
        </div>
      )}

      {/* WYSIWYG editable surface — formatting renders visually, never as tags */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onPaste={(e) => {
          // Paste as plain text so external markup never leaks in.
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
          emit();
        }}
        className="template-wysiwyg w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 overflow-y-auto whitespace-pre-wrap"
        style={{ textAlign: value.alignment, minHeight, fontFamily: currentFont, fontSize: `${currentSize}pt` }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("text/plain")) e.preventDefault();
        }}
        onDrop={(e) => {
          const token = e.dataTransfer.getData("text/plain");
          if (!token || !token.startsWith("[") || !token.endsWith("]")) return;
          e.preventDefault();
          insertToken(token);
        }}
      />
    </div>
  );
}
