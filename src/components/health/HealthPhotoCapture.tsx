import { useState, useRef, useCallback } from "react";
import { Camera, X, Check, Loader2, Dumbbell, Utensils, Wallet as Pill } from "lucide-react";
import { mapCameraError } from "@/lib/cameraErrors";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface HealthPhotoCaptureProps {
  patientId: string;
  onPhotoSaved: () => void;
}

type PhotoCategory = 'gym' | 'healthy_meal' | 'medication';

const CATEGORIES = [
  { id: 'gym' as PhotoCategory, label: 'Gym / Exercise', icon: Dumbbell, color: 'bg-blue-500', lollipops: 2 },
  { id: 'healthy_meal' as PhotoCategory, label: 'Healthy Meal', icon: Utensils, color: 'bg-sky-500', lollipops: 1 },
  { id: 'medication' as PhotoCategory, label: 'Medication', icon: Pill, color: 'bg-purple-500', lollipops: 3 },
];

export function HealthPhotoCapture({ patientId, onPhotoSaved }: HealthPhotoCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PhotoCategory | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCapturing(true);
    } catch (error) {
      console.error('Camera access error:', error);
      const friendly = mapCameraError(error);
      toast({
        title: friendly.title,
        description: friendly.description,
        variant: "destructive",
      });
    }

  }, [toast]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      stopCamera();
    }
  }, [stopCamera]);

  const resetCapture = () => {
    setCapturedImage(null);
    setValidationResult(null);
    startCamera();
  };

  const handleCategorySelect = (category: PhotoCategory) => {
    setSelectedCategory(category);
    startCamera();
  };

  const validateAndSavePhoto = async () => {
    if (!capturedImage || !selectedCategory || !patientId) return;

    setIsValidating(true);
    
    try {
      // First, upload the photo to storage
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `${user.id}/${Date.now()}.jpg`;
      const base64Data = capturedImage.split(',')[1];
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      const { error: uploadError } = await supabase.storage
        .from('health-photos')
        .upload(fileName, binaryData, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // Bucket is private — store the path; UI mints signed URLs on demand.
      // The validator receives the photo as a data URL so it never needs public access.
      const photoPath = fileName;

      // Validate with AI (pass image inline as data URL)
      const { data: validationData, error: validationError } = await supabase.functions.invoke('validate-health-photo', {
        body: { photoDataUrl: capturedImage, category: selectedCategory, patientId }
      });

      if (validationError) throw validationError;

      setValidationResult(validationData);

      if (validationData.alreadySubmittedToday) {
        toast({
          title: "Already Submitted",
          description: `You've already submitted a ${selectedCategory.replace('_', ' ')} photo today. Try again tomorrow!`,
          variant: "destructive",
        });
        // Clean up unused upload
        await supabase.storage.from('health-photos').remove([photoPath]);
        return;
      }

      if (!validationData.validation?.isValid || !validationData.validation?.category_match) {
        toast({
          title: "Photo Not Validated",
          description: validationData.validation?.description || "The photo doesn't match the selected category. Please try again.",
          variant: "destructive",
        });
        // Delete the uploaded photo since it wasn't validated
        await supabase.storage.from('health-photos').remove([photoPath]);
        return;
      }

      // Save to database — store the storage path, not a public URL.
      const { error: saveError } = await supabase
        .from('health_photos')
        .insert({
          patient_id: patientId,
          photo_url: photoPath,
          category: selectedCategory,
          ai_validation_result: validationData.validation,
          is_validated: true,
          lollipops_awarded: validationData.lollipopsToAward,
          photo_date: validationData.photoDate,
        });

      if (saveError) throw saveError;

      // Award lollipops
      if (validationData.lollipopsToAward > 0) {
        const { error: rewardError } = await supabase
          .from('patient_rewards')
          .insert({
            patient_id: patientId,
            awarded_by: user.id,
            lollipops_count: validationData.lollipopsToAward,
            visit_category: `health_photo_${selectedCategory}`,
            reward_type: 'lollipop',
          });

        if (rewardError) console.error('Error awarding lollipops:', rewardError);
      }

      toast({
        title: "Photo Saved!",
        description: `Great job! You earned ${validationData.lollipopsToAward} lollipop${validationData.lollipopsToAward > 1 ? 's' : ''}! 🍭`,
      });

      onPhotoSaved();
      handleClose();

    } catch (error) {
      console.error('Error saving photo:', error);
      toast({
        title: "Error",
        description: "Failed to save photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setIsOpen(false);
    setSelectedCategory(null);
    setCapturedImage(null);
    setValidationResult(null);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Camera className="h-4 w-4" />
        Capture Health Photo
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {!selectedCategory ? "Select Category" : 
               isCapturing ? "Take Photo" : 
               capturedImage ? "Review Photo" : "Health Photo"}
            </DialogTitle>
          </DialogHeader>

          {!selectedCategory ? (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">
                What type of healthy behavior would you like to capture?
              </p>
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat.id}
                  variant="outline"
                  className="h-auto py-4 justify-start gap-4"
                  onClick={() => handleCategorySelect(cat.id)}
                >
                  <div className={cn("p-2 rounded-lg", cat.color)}>
                    <cat.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{cat.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Earn {cat.lollipops} lollipop{cat.lollipops > 1 ? 's' : ''}
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          ) : isCapturing ? (
            <div className="space-y-4">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={capturePhoto} className="gap-2">
                  <Camera className="h-4 w-4" />
                  Capture
                </Button>
              </div>
            </div>
          ) : capturedImage ? (
            <div className="space-y-4">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              </div>
              
              {validationResult && (
                <div className={cn(
                  "p-3 rounded-lg text-sm",
                  validationResult.validation?.isValid && validationResult.validation?.category_match
                    ? "bg-sky-50 text-primary dark:bg-primary/15 dark:text-primary"
                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                )}>
                  {validationResult.validation?.description}
                </div>
              )}

              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={resetCapture} disabled={isValidating}>
                  <X className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                <Button onClick={validateAndSavePhoto} disabled={isValidating}>
                  {isValidating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save Photo
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : null}

          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>
    </>
  );
}
