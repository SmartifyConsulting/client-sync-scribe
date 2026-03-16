import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, Video, Square, Upload, Loader2, Play, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MediaCaptureProps {
  patientId: string;
  patientName: string;
  onSaved?: () => void;
}

export function MediaCapture({ patientId, patientName, onSaved }: MediaCaptureProps) {
  const { toast } = useToast();
  const [mediaType, setMediaType] = useState<"audio" | "video">("audio");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = useCallback(async () => {
    try {
      const constraints = mediaType === "video" 
        ? { audio: true, video: { facingMode: "environment" } }
        : { audio: true };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (mediaType === "video" && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const mimeType = mediaType === "video" ? "video/webm" : "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      toast({
        title: "Permission Denied",
        description: `Could not access ${mediaType} device. Please allow permissions.`,
        variant: "destructive",
      });
    }
  }, [mediaType, toast]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const discardRecording = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const isAudio = file.type.startsWith("audio/");
    if (!isVideo && !isAudio) {
      toast({ title: "Invalid File", description: "Please select an audio or video file", variant: "destructive" });
      return;
    }
    setMediaType(isVideo ? "video" : "audio");
    setRecordedBlob(file);
    setRecordedUrl(URL.createObjectURL(file));
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
  };

  const handleSave = async () => {
    if (!recordedBlob || !title.trim()) {
      toast({ title: "Missing Info", description: "Please provide a title", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const ext = mediaType === "video" ? "webm" : "webm";
      const fileName = `${patientId}/${Date.now()}.${ext}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("patient-media")
        .upload(fileName, recordedBlob, { contentType: recordedBlob.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("patient-media")
        .getPublicUrl(fileName);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: docError } = await supabase
        .from("documents")
        .insert({
          name: title,
          content: `[${mediaType.toUpperCase()} Recording] ${title}`,
          user_id: user.id,
          patient_id: patientId,
          patient_name: patientName,
          media_url: publicUrl,
          media_type: mediaType,
        });

      if (docError) throw docError;

      toast({ title: "Media Saved", description: `${mediaType === "video" ? "Video" : "Audio"} saved to patient documents` });
      discardRecording();
      setTitle("");
      onSaved?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save media", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {mediaType === "video" ? <Video className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          Record Media
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Select value={mediaType} onValueChange={(v: "audio" | "video") => setMediaType(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="video">Video</SelectItem>
            </SelectContent>
          </Select>

          {!isRecording && !recordedBlob && (
            <>
              <Button onClick={startRecording} className="gap-2" variant="default">
                {mediaType === "video" ? <Video className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                Record
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                Upload File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </>
          )}

          {isRecording && (
            <Button onClick={stopRecording} variant="destructive" className="gap-2">
              <Square className="h-4 w-4" />
              Stop
            </Button>
          )}
        </div>

        {isRecording && mediaType === "video" && (
          <video ref={videoPreviewRef} className="w-full max-h-48 rounded-lg bg-black" muted />
        )}

        {isRecording && mediaType === "audio" && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm text-destructive font-medium">Recording...</span>
          </div>
        )}

        {recordedUrl && !isRecording && (
          <div className="space-y-3">
            {mediaType === "video" ? (
              <video src={recordedUrl} controls className="w-full max-h-48 rounded-lg bg-black" />
            ) : (
              <audio src={recordedUrl} controls className="w-full" />
            )}

            <div className="space-y-2">
              <Label htmlFor="media-title">Title *</Label>
              <Input
                id="media-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Pre-surgery gait recording"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={discardRecording} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Discard
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !title.trim()} className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save to Documents
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
