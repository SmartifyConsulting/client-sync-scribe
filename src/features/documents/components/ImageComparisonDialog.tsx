import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Image, Plus, Trash2, Sparkles, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageSlot {
  file?: File;
  url?: string;
  label: string;
  preview?: string;
}

interface ImageComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: string;
  existingImageUrls?: { url: string; label: string }[];
}

const COMPARISON_TYPES = [
  { value: "wound_progression", label: "Wound Progression" },
  { value: "before_after_surgery", label: "Before/After Surgery" },
  { value: "treatment_progress", label: "Recommendation Progress" },
  { value: "general", label: "General Comparison" },
];

export function ImageComparisonDialog({
  open,
  onOpenChange,
  patientId,
  existingImageUrls = [],
}: ImageComparisonDialogProps) {
  const { toast } = useToast();
  const [images, setImages] = useState<ImageSlot[]>(
    existingImageUrls.length > 0
      ? existingImageUrls.map((img) => ({ url: img.url, label: img.label }))
      : [{ label: "" }, { label: "" }]
  );
  const [comparisonType, setComparisonType] = useState("general");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);

  const handleFileSelect = (index: number) => {
    setActiveSlotIndex(index);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeSlotIndex === null) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Images must be under 5MB", variant: "destructive" });
      return;
    }
    const preview = URL.createObjectURL(file);
    setImages((prev) =>
      prev.map((img, i) => (i === activeSlotIndex ? { ...img, file, preview } : img))
    );
    e.target.value = "";
  };

  const addSlot = () => {
    if (images.length >= 6) return;
    setImages((prev) => [...prev, { label: "" }]);
  };

  const removeSlot = (index: number) => {
    if (images.length <= 2) return;
    setImages((prev) => {
      const img = prev[index];
      if (img.preview) URL.revokeObjectURL(img.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateLabel = (index: number, label: string) => {
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, label } : img)));
  };

  const handleCompare = async () => {
    const readyImages = images.filter((img) => img.file || img.url);
    if (readyImages.length < 2) {
      toast({ title: "Need at least 2 images", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      // Upload files that don't have URLs yet
      const imageUrls: string[] = [];
      const imageLabels: string[] = [];

      for (const img of readyImages) {
        if (img.url) {
          imageUrls.push(img.url);
          imageLabels.push(img.label || `Image ${imageUrls.length}`);
        } else if (img.file) {
          const ext = img.file.name.split(".").pop() || "jpg";
          const fileName = `comparisons/${patientId || "general"}/${Date.now()}_${imageUrls.length}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("patient-media")
            .upload(fileName, img.file, { contentType: img.file.type });
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage
            .from("patient-media")
            .getPublicUrl(fileName);
          imageUrls.push(publicUrl);
          imageLabels.push(img.label || `Image ${imageUrls.length}`);
        }
      }

      const { data, error } = await supabase.functions.invoke("compare-medical-images", {
        body: { imageUrls, imageLabels, comparisonType, patientId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAnalysis(data.analysis);
      toast({ title: "Comparison Complete", description: "AI analysis is ready" });
    } catch (err: any) {
      toast({
        title: "Comparison Failed",
        description: err.message || "Could not compare images",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetDialog = () => {
    images.forEach((img) => { if (img.preview) URL.revokeObjectURL(img.preview); });
    setImages([{ label: "" }, { label: "" }]);
    setAnalysis(null);
    setComparisonType("general");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetDialog(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Compare Medical Images
          </DialogTitle>
          <DialogDescription>
            Upload 2-6 images for AI-powered comparison and progression analysis.
          </DialogDescription>
        </DialogHeader>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />

        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-4">
            {/* Comparison Type */}
            <div className="space-y-1.5">
              <Label className="text-xs">Comparison Type</Label>
              <Select value={comparisonType} onValueChange={setComparisonType}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPARISON_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Image Slots */}
            <div className="grid grid-cols-2 gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative border rounded-lg p-2 space-y-2">
                  {images.length > 2 && (
                    <button
                      onClick={() => removeSlot(i)}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <div
                    onClick={() => handleFileSelect(i)}
                    className={cn(
                      "aspect-square rounded-md border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden",
                      (img.preview || img.url) ? "border-primary/30" : "border-border"
                    )}
                  >
                    {(img.preview || img.url) ? (
                      <img
                        src={img.preview || img.url}
                        alt={img.label || `Image ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Plus className="h-6 w-6 mx-auto mb-1" />
                        <span className="text-xs">Add Image</span>
                      </div>
                    )}
                  </div>
                  <Input
                    placeholder={`Label (e.g., Day 1, Before)`}
                    value={img.label}
                    onChange={(e) => updateLabel(i, e.target.value)}
                    className="h-7 text-sm"
                  />
                </div>
              ))}
            </div>

            {images.length < 6 && (
              <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={addSlot}>
                <Plus className="h-3.5 w-3.5" />
                Add Image ({images.length}/6)
              </Button>
            )}

            {/* Compare Button */}
            <Button
              className="w-full gap-2"
              onClick={handleCompare}
              disabled={isAnalyzing || images.filter((img) => img.file || img.url).length < 2}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Compare with AI
                </>
              )}
            </Button>

            {/* Analysis Results */}
            {analysis && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Comparison Analysis
                </h4>
                <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {analysis}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
