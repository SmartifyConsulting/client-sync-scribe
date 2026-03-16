import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VisitCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (category: string | null) => void;
  patientName?: string;
}

export function VisitCategoryDialog({
  open,
  onOpenChange,
  onConfirm,
  patientName,
}: VisitCategoryDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [customCategory, setCustomCategory] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const handleConfirm = () => {
    const category = showCustom ? customCategory : selectedCategory;
    onConfirm(category || null);
    setSelectedCategory("");
    setCustomCategory("");
    setShowCustom(false);
  };

  const handleSkip = () => {
    onConfirm(null);
    setSelectedCategory("");
    setCustomCategory("");
    setShowCustom(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">Ⓜ️</span>
            Award Moola?
          </DialogTitle>
          <DialogDescription>
            Select the visit type to award {patientName || "the patient"} moola for attending a healthy visit.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Visit Category</Label>
            <Select
              value={selectedCategory}
              onValueChange={(value) => {
                if (value === "other") {
                  setShowCustom(true);
                  setSelectedCategory("");
                } else {
                  setShowCustom(false);
                  setSelectedCategory(value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select visit type..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="GP Visit">GP Visit / General Consultation</SelectItem>
                <SelectItem value="Optometrist">Optometrist / Eye Exam</SelectItem>
                <SelectItem value="Vital Signs Check">Vital Signs Check</SelectItem>
                <SelectItem value="Cholesterol Test">Cholesterol Test</SelectItem>
                <SelectItem value="Blood Sugar Test">Blood Sugar / Diabetes Screening</SelectItem>
                <SelectItem value="HIV Test">HIV Test</SelectItem>
                <SelectItem value="Pap Smear">Pap Smear / Cervical Screening</SelectItem>
                <SelectItem value="Mammogram">Mammogram / Breast Exam</SelectItem>
                <SelectItem value="Prostate Exam">Prostate Exam</SelectItem>
                <SelectItem value="Vaccination">Vaccination / Immunization</SelectItem>
                <SelectItem value="Annual Physical">Annual Physical / Wellness Check</SelectItem>
                <SelectItem value="Health Screening">General Health Screening</SelectItem>
                <SelectItem value="other">Other (specify)...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showCustom && (
            <div className="space-y-2">
              <Label>Custom Visit Type</Label>
              <Input
                placeholder="Enter visit type..."
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={handleSkip} className="sm:mr-auto">
            Skip (No lollipop)
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedCategory && !customCategory}
            className="bg-pink-500 hover:bg-pink-600 text-white"
          >
            🍭 Award Lollipop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
