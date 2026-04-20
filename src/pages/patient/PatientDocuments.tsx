import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  FileText,
  AlertTriangle,
  ArrowUpCircle,
  Mic,
  Video,
  Upload,
  Square,
  Loader2,
  Trash2,
  Save,
  Receipt,
  Pill,
  FileCheck,
  Send,
  File,
  Image,
  Sparkles,
  X,
  RotateCw,
  GitCompare,
  Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageComparisonDialog } from "@/components/documents/ImageComparisonDialog";
import { renderFormattedContent } from "@/utils/documentFormatting";
import { useDocumentHeaderFooter } from "@/hooks/useDocumentHeaderFooter";

const STORAGE_LIMIT_MB = 100;

type DocType =
  | "prescription"
  | "invoice"
  | "medical_certificate"
  | "referral_letter"
  | "general_letter"
  | "hospital_admission"
  | "audio"
  | "video"
  | "image"
  | "file";

interface UnifiedDocument {
  id: string;
  name: string;
  type: DocType;
  date: string;
  sizeBytes: number;
  source: "documents" | "prescriptions" | "invoices";
  content?: string;
  mediaUrl?: string;
  aiAnalysis?: string | null;
  aiAnalyzedAt?: string | null;
  emailSentAt?: string | null;
  patientId?: string | null;
  userId?: string | null;
  templateName?: string | null;
}

const DOC_TYPE_CONFIG: Record<
  DocType,
  { label: string; color: string; borderColor: string; icon: typeof FileText }
> = {
  prescription: {
    label: "Prescription",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    borderColor: "border-emerald-400",
    icon: Pill,
  },
  invoice: {
    label: "Invoice",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    borderColor: "border-amber-400",
    icon: Receipt,
  },
  medical_certificate: {
    label: "Medical Certificate",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    borderColor: "border-blue-400",
    icon: FileCheck,
  },
  referral_letter: {
    label: "Referral Letter",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    borderColor: "border-purple-400",
    icon: Send,
  },
  general_letter: {
    label: "General Letter",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
    borderColor: "border-slate-400",
    icon: FileText,
  },
  hospital_admission: {
    label: "Hospital Admission",
    color: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
    borderColor: "border-rose-400",
    icon: FileText,
  },
  audio: {
    label: "Audio",
    color: "bg-muted text-muted-foreground",
    borderColor: "border-muted-foreground/50",
    icon: Mic,
  },
  video: {
    label: "Video",
    color: "bg-muted text-muted-foreground",
    borderColor: "border-muted-foreground/50",
    icon: Video,
  },
  image: {
    label: "Image",
    color: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
    borderColor: "border-sky-400",
    icon: Image,
  },
  file: {
    label: "File",
    color: "bg-muted text-muted-foreground",
    borderColor: "border-muted-foreground/50",
    icon: File,
  },
};

const FILTER_OPTIONS: { value: DocType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "prescription", label: "Prescriptions" },
  { value: "invoice", label: "Invoices" },
  { value: "medical_certificate", label: "Certificates" },
  { value: "referral_letter", label: "Referrals" },
  { value: "general_letter", label: "Letters" },
  { value: "hospital_admission", label: "Admissions" },
  { value: "image", label: "Images" },
  { value: "audio", label: "Audio" },
  { value: "video", label: "Video" },
];

function deriveDocType(
  templateName: string | null,
  mediaType: string | null
): DocType {
  if (mediaType === "audio") return "audio";
  if (mediaType === "video") return "video";
  if (mediaType === "image") return "image";
  const lower = (templateName || "").toLowerCase();
  if (lower.includes("prescription")) return "prescription";
  if (lower.includes("invoice")) return "invoice";
  if (lower.includes("hospital admission")) return "hospital_admission";
  if (lower.includes("medical certificate") || lower.includes("certificate"))
    return "medical_certificate";
  if (lower.includes("referral")) return "referral_letter";
  if (lower.includes("letter")) return "general_letter";
  if (templateName) return "general_letter";
  return "file";
}

export default function PatientDocuments({ hideHeader = false }: { hideHeader?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<UnifiedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageMB, setStorageMB] = useState(0);
  const [filter, setFilter] = useState<DocType | "all">("all");
  const [patientIds, setPatientIds] = useState<string[]>([]);
  const [patientName, setPatientName] = useState("");

  // Media recording state
  const [recordingMode, setRecordingMode] = useState<"audio" | "video" | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [mediaTitle, setMediaTitle] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Analysis state
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null);
  const [analysisDialog, setAnalysisDialog] = useState<UnifiedDocument | null>(null);
  const [sendingDocId, setSendingDocId] = useState<string | null>(null);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<UnifiedDocument | null>(null);

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  async function fetchAll() {
    if (!user) return;
    setLoading(true);

    const { data: patients } = await supabase
      .from("patients")
      .select("id, name")
      .eq("patient_user_id", user.id);

    if (!patients?.length) {
      setLoading(false);
      return;
    }

    const ids = patients.map((p) => p.id);
    setPatientIds(ids);
    setPatientName(patients[0]?.name || "");

    const [docsRes, rxRes, invRes] = await Promise.all([
      supabase
        .from("documents")
        .select("id, name, content, template_name, created_at, media_type, media_url, ai_analysis, ai_analyzed_at, email_sent_at, patient_id, user_id")
        .in("patient_id", ids)
        .order("created_at", { ascending: false }),
      supabase
        .from("prescriptions")
        .select("id, medication, dosage, frequency, created_at, status")
        .in("patient_id", ids)
        .order("created_at", { ascending: false }),
      supabase
        .from("invoices")
        .select("id, invoice_number, description, amount, status, created_at")
        .in("patient_id", ids)
        .order("created_at", { ascending: false }),
    ]);

    const unified: UnifiedDocument[] = [];

    for (const doc of docsRes.data || []) {
      const sizeBytes = new Blob([doc.content]).size;
      unified.push({
        id: doc.id,
        name: doc.name,
        type: deriveDocType(doc.template_name, doc.media_type),
        date: doc.created_at,
        sizeBytes,
        source: "documents",
        content: doc.content,
        mediaUrl: doc.media_url,
        aiAnalysis: (doc as any).ai_analysis,
        aiAnalyzedAt: (doc as any).ai_analyzed_at,
        emailSentAt: (doc as any).email_sent_at,
        patientId: (doc as any).patient_id,
        userId: (doc as any).user_id,
        templateName: doc.template_name,
      });
    }

    for (const rx of rxRes.data || []) {
      const desc = `${rx.medication} – ${rx.dosage} (${rx.frequency})`;
      unified.push({
        id: rx.id,
        name: rx.medication,
        type: "prescription",
        date: rx.created_at,
        sizeBytes: new Blob([desc]).size,
        source: "prescriptions",
        content: desc,
      });
    }

    for (const inv of invRes.data || []) {
      const desc = `${inv.invoice_number}: ${inv.description} – R${inv.amount}`;
      unified.push({
        id: inv.id,
        name: `Invoice ${inv.invoice_number}`,
        type: "invoice",
        date: inv.created_at,
        sizeBytes: new Blob([desc]).size,
        source: "invoices",
        content: desc,
      });
    }

    unified.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setDocuments(unified);

    const totalBytes = (docsRes.data || []).reduce(
      (acc, doc) => acc + new Blob([doc.content]).size,
      0
    );
    setStorageMB(totalBytes / (1024 * 1024));
    setLoading(false);
  }

  const filteredDocs =
    filter === "all" ? documents : documents.filter((d) => d.type === filter);

  const usagePercent = Math.min((storageMB / STORAGE_LIMIT_MB) * 100, 100);
  const isNearLimit = usagePercent >= 80;
  const isOverLimit = usagePercent >= 100;

  // Media recording
  const startRecording = useCallback(
    async (type: "audio" | "video") => {
      try {
        const constraints =
          type === "video"
            ? { audio: true, video: { facingMode: "environment" } }
            : { audio: true };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (type === "video" && videoPreviewRef.current) {
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
          const blob = new Blob(chunksRef.current, {
            type: type === "video" ? "video/webm" : "audio/webm",
          });
          setRecordedBlob(blob);
          setRecordedUrl(URL.createObjectURL(blob));
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        };
        recorder.start();
        setRecordingMode(type);
        setIsRecording(true);
      } catch {
        toast({
          title: "Permission Denied",
          description: `Could not access ${type} device.`,
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const discardRecording = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingMode(null);
    setMediaTitle("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Files must be under 5MB",
        variant: "destructive",
      });
      return;
    }
    const isVideo = file.type.startsWith("video/");
    const isAudio = file.type.startsWith("audio/");
    const isImage = file.type.startsWith("image/");

    if (isImage) {
      // Handle image upload directly
      handleImageUpload(file);
      return;
    }

    setRecordingMode(isVideo ? "video" : isAudio ? "audio" : "audio");
    setRecordedBlob(file);
    setRecordedUrl(URL.createObjectURL(file));
    if (!mediaTitle) setMediaTitle(file.name.replace(/\.[^/.]+$/, ""));
  };

  const handleImageUpload = async (file: globalThis.File) => {
    if (!patientIds[0]) return;
    setIsSaving(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${patientIds[0]}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("patient-media")
        .upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("patient-media").getPublicUrl(fileName);

      const docName = file.name.replace(/\.[^/.]+$/, "");
      const { error: docError } = await supabase.from("documents").insert({
        name: docName,
        content: `[IMAGE] ${docName}`,
        user_id: user!.id,
        patient_id: patientIds[0],
        patient_name: patientName,
        media_url: publicUrl,
        media_type: "image",
      });
      if (docError) throw docError;

      toast({ title: "Image Uploaded", description: "Image saved to your documents" });
      fetchAll();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveMedia = async () => {
    if (!recordedBlob || !mediaTitle.trim() || !patientIds[0]) return;
    if (recordedBlob.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Media files must be under 5MB",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    try {
      const fileName = `${patientIds[0]}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("patient-media")
        .upload(fileName, recordedBlob, { contentType: recordedBlob.type });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("patient-media").getPublicUrl(fileName);

      const { error: docError } = await supabase.from("documents").insert({
        name: mediaTitle,
        content: `[${(recordingMode || "audio").toUpperCase()} Recording] ${mediaTitle}`,
        user_id: user!.id,
        patient_id: patientIds[0],
        patient_name: patientName,
        media_url: publicUrl,
        media_type: recordingMode || "audio",
      });
      if (docError) throw docError;

      toast({ title: "Saved", description: "Media saved to your documents" });
      discardRecording();
      fetchAll();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAIAnalysis = async (doc: UnifiedDocument) => {
    if (doc.aiAnalysis) {
      setAnalysisDialog(doc);
      return;
    }

    setAnalyzingDocId(doc.id);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-medical-image", {
        body: { imageUrl: doc.mediaUrl, documentId: doc.id },
      });

      if (error) throw error;

      const updatedDoc = {
        ...doc,
        aiAnalysis: data.analysis,
        aiAnalyzedAt: data.analyzedAt,
      };

      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? updatedDoc : d))
      );
      setAnalysisDialog(updatedDoc);

      toast({ title: "Analysis Complete", description: "AI interpretation is ready" });
    } catch (err: any) {
      toast({
        title: "Analysis Failed",
        description: err.message || "Could not analyse the image",
        variant: "destructive",
      });
    } finally {
      setAnalyzingDocId(null);
    }
  };

  const handleSendDocument = async (doc: UnifiedDocument) => {
    if (doc.source !== "documents" || doc.emailSentAt) return;
    setSendingDocId(doc.id);
    try {
      const { data: docData } = await supabase
        .from("documents")
        .select("*, patients:patient_id(email, pharmacy_email)")
        .eq("id", doc.id)
        .maybeSingle();
      if (!docData) throw new Error("Document not found");
      const patient = (docData as any).patients;
      const recipientEmail = doc.type === "prescription"
        ? patient?.pharmacy_email || patient?.email
        : patient?.email;
      if (recipientEmail) {
        await supabase.functions.invoke("send-document-email", {
          body: { documentId: doc.id, recipientEmail },
        });
      }
      await supabase
        .from("documents")
        .update({ email_sent_at: new Date().toISOString(), is_draft: false } as any)
        .eq("id", doc.id);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id ? { ...d, emailSentAt: new Date().toISOString() } : d
        )
      );
      toast({ title: "Document Sent", description: `${doc.name} has been sent.` });
    } catch (err: any) {
      toast({ title: "Send Failed", description: err.message || "Could not send", variant: "destructive" });
    } finally {
      setSendingDocId(null);
    }
  };

  const handleReAnalyse = async () => {
    if (!analysisDialog) return;
    setAnalysisDialog({ ...analysisDialog, aiAnalysis: null, aiAnalyzedAt: null });
    setAnalyzingDocId(analysisDialog.id);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-medical-image", {
        body: { imageUrl: analysisDialog.mediaUrl, documentId: analysisDialog.id },
      });

      if (error) throw error;

      const updatedDoc = {
        ...analysisDialog,
        aiAnalysis: data.analysis,
        aiAnalyzedAt: data.analyzedAt,
      };

      setDocuments((prev) =>
        prev.map((d) => (d.id === analysisDialog.id ? updatedDoc : d))
      );
      setAnalysisDialog(updatedDoc);
      toast({ title: "Re-analysis Complete" });
    } catch (err: any) {
      toast({
        title: "Re-analysis Failed",
        description: err.message || "Could not re-analyse",
        variant: "destructive",
      });
    } finally {
      setAnalyzingDocId(null);
    }
  };

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        {!hideHeader ? (
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-foreground">My Documents</h1>
            <p className="text-muted-foreground text-[11px] md:text-[12px]">
              All your prescriptions, invoices, certificates and uploaded files.
            </p>
          </div>
        ) : <div />}

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => startRecording("audio")}
            disabled={isRecording}
            title="Record Audio"
          >
            <Mic className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => startRecording("video")}
            disabled={isRecording}
            title="Record Video"
          >
            <Video className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={isRecording || isSaving}
            title="Upload File"
          >
            <Upload className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setShowCompareDialog(true)}
            title="Compare Images"
          >
            <GitCompare className="h-3.5 w-3.5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="audio/*,video/*,.pdf,.doc,.docx,.jpg,.jpeg,.png,.bmp,.dicom,image/*"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Recording UI */}
      {(isRecording || recordedBlob) && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            {isRecording && recordingMode === "video" && (
              <video
                ref={videoPreviewRef}
                className="w-full max-h-48 rounded-lg bg-black"
                muted
              />
            )}
            {isRecording && recordingMode === "audio" && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm text-destructive font-medium">
                  Recording...
                </span>
              </div>
            )}
            {isRecording && (
              <Button
                onClick={stopRecording}
                variant="destructive"
                className="gap-2"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            )}
            {recordedUrl && !isRecording && (
              <div className="space-y-3">
                {recordingMode === "video" ? (
                  <video
                    src={recordedUrl}
                    controls
                    className="w-full max-h-48 rounded-lg bg-black"
                  />
                ) : (
                  <audio src={recordedUrl} controls className="w-full" />
                )}
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={mediaTitle}
                    onChange={(e) => setMediaTitle(e.target.value)}
                    placeholder="e.g., Follow-up note"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={discardRecording}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Discard
                  </Button>
                  <Button
                    onClick={handleSaveMedia}
                    disabled={isSaving || !mediaTitle.trim()}
                    className="gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Storage Usage */}
      <Card
        className={
          isOverLimit
            ? "border-destructive"
            : isNearLimit
            ? "border-yellow-500"
            : ""
        }
      >
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Storage Usage</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {storageMB.toFixed(2)} MB / {STORAGE_LIMIT_MB} MB
            </span>
          </div>
          <Progress value={usagePercent} className="h-2.5" />
          {isOverLimit && (
            <div className="flex items-center gap-2 mt-3 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>Storage limit reached.</span>
              <button className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:opacity-80">
                <ArrowUpCircle className="h-3.5 w-3.5" />
                Upgrade plan
              </button>
            </div>
          )}
          {isNearLimit && !isOverLimit && (
            <p className="text-sm text-yellow-600 mt-2">
              You're approaching your storage limit. Consider upgrading for an
              additional 100 MB.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Filter Dropdown */}
      <div className="flex items-center gap-2">
        <Select value={filter} onValueChange={(v) => setFilter(v as DocType | "all")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((opt) => {
              const config = opt.value !== "all" ? DOC_TYPE_CONFIG[opt.value] : null;
              const OptIcon = config?.icon;
              return (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    {OptIcon && <OptIcon className="h-3.5 w-3.5" />}
                    {opt.label}
                    {opt.value !== "all" && (
                      <span className="text-muted-foreground">
                        ({documents.filter((d) => d.type === opt.value).length})
                      </span>
                    )}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {filter === "all" ? "No documents yet" : "No matching documents"}
            </h3>
            <p className="text-muted-foreground text-sm">
              Documents generated during your consultations will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredDocs.map((doc) => {
            const config = DOC_TYPE_CONFIG[doc.type];
            const IconComponent = config.icon;
            const isAnalyzing = analyzingDocId === doc.id;
            const isImageDoc = doc.type === "image" && doc.mediaUrl;
            return (
              <Card key={`${doc.source}-${doc.id}`} className={`hover:shadow-sm transition-shadow border-l-4 ${config.borderColor}`}>
                <CardContent className="flex items-center gap-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    {isImageDoc ? (
                      <img
                        src={doc.mediaUrl}
                        alt={doc.name}
                        className="h-8 w-8 rounded-lg object-cover"
                      />
                    ) : (
                      <IconComponent className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {doc.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={`inline-flex items-center justify-center h-4 w-4 rounded-full ${config.color}`} title={config.label}>
                        <IconComponent className="h-2.5 w-2.5" />
                      </span>
                      {doc.aiAnalysis && (
                        <Badge variant="secondary" className="text-[10px] h-4 border-0 bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 gap-0.5 px-1">
                          <Sparkles className="h-2.5 w-2.5" />
                          AI
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(doc.date), "dd MMM yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {doc.source === "documents" && doc.content && !doc.mediaUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary hover:text-primary/80"
                        onClick={() => setPreviewDoc(doc)}
                        title="Preview document"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {doc.source === "documents" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-7 w-7", doc.emailSentAt ? "text-muted-foreground cursor-not-allowed" : "text-green-600 hover:text-green-700")}
                        onClick={() => handleSendDocument(doc)}
                        disabled={!!doc.emailSentAt || sendingDocId === doc.id}
                        title={doc.emailSentAt ? "Already sent" : "Send document"}
                      >
                        {sendingDocId === doc.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                    {isImageDoc && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => handleAIAnalysis(doc)}
                        disabled={isAnalyzing}
                      >
                        {isAnalyzing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        {doc.aiAnalysis ? "View" : "AI"}
                      </Button>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {(doc.sizeBytes / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* AI Analysis Dialog */}
      <Dialog open={!!analysisDialog} onOpenChange={(open) => !open && setAnalysisDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
              AI Image Analysis
            </DialogTitle>
            <DialogDescription>
              {analysisDialog?.name}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {/* Image Preview */}
              {analysisDialog?.mediaUrl && (
                <div className="rounded-lg overflow-hidden border bg-muted">
                  <img
                    src={analysisDialog.mediaUrl}
                    alt={analysisDialog.name}
                    className="w-full max-h-64 object-contain"
                  />
                </div>
              )}

              {/* Analysis Content */}
              {analysisDialog?.aiAnalysis ? (
                <div className="space-y-3">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                    {analysisDialog.aiAnalysis}
                  </div>

                  {analysisDialog.aiAnalyzedAt && (
                    <p className="text-xs text-muted-foreground">
                      Analysed on {format(new Date(analysisDialog.aiAnalyzedAt), "dd MMM yyyy 'at' HH:mm")}
                    </p>
                  )}
                </div>
              ) : analyzingDocId === analysisDialog?.id ? (
                <div className="flex items-center justify-center py-12 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Analysing image...</span>
                </div>
              ) : null}

              {/* Disclaimer */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    This AI analysis is for informational purposes only and does not constitute a medical diagnosis. Always consult a qualified healthcare professional for clinical interpretation and treatment decisions.
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Re-analyse button */}
          {analysisDialog?.aiAnalysis && (
            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReAnalyse}
                disabled={analyzingDocId === analysisDialog?.id}
                className="gap-1.5"
              >
                {analyzingDocId === analysisDialog?.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCw className="h-3.5 w-3.5" />
                )}
                Re-analyse
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DocumentPreviewDialog
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      <ImageComparisonDialog
        open={showCompareDialog}
        onOpenChange={setShowCompareDialog}
        patientId={patientIds[0]}
      />
    </div>
  );
}

// ---------- Preview Dialog with provider letterhead ----------

interface HFCell {
  text: string;
  alignment: string;
  imageUrl?: string;
}

function renderHFCell(cell: HFCell | undefined) {
  if (!cell) return null;
  return (
    <div style={{ textAlign: (cell.alignment as any) || "left" }}>
      {cell.imageUrl && (
        <img src={cell.imageUrl} alt="" className="max-h-12 inline-block mb-1 object-contain" />
      )}
      {cell.text && (
        <div
          className="whitespace-pre-wrap text-xs text-black"
          dangerouslySetInnerHTML={{ __html: renderFormattedContent(cell.text) }}
        />
      )}
    </div>
  );
}

function DocumentPreviewDialog({
  doc,
  onClose,
}: {
  doc: UnifiedDocument | null;
  onClose: () => void;
}) {
  const { headerFooter, isLoading } = useDocumentHeaderFooter(
    doc ? { id: doc.id, user_id: doc.userId, template_name: doc.templateName } : null
  );

  const header = (headerFooter?.header as any) || null;
  const footer = (headerFooter?.footer as any) || null;
  const fontFamily = headerFooter?.font_family || undefined;

  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{doc?.name}</DialogTitle>
          <DialogDescription>
            {doc?.date && `Created: ${format(new Date(doc.date), "dd MMM yyyy")}`}
          </DialogDescription>
        </DialogHeader>
        {doc && (
          <div className="border border-border rounded-lg p-6 bg-white" style={{ fontFamily }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              header && (
                <div className="pb-4 border-b border-gray-200 mb-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>{renderHFCell(header.left)}</div>
                    <div>{renderHFCell(header.center)}</div>
                    <div>{renderHFCell(header.right)}</div>
                  </div>
                </div>
              )
            )}

            <div
              className="whitespace-pre-wrap text-sm text-black min-h-[100px]"
              dangerouslySetInnerHTML={{ __html: renderFormattedContent(doc.content || "") }}
            />

            {footer && (
              <div className="pt-4 border-t border-gray-200 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>{renderHFCell(footer.left)}</div>
                  <div>{renderHFCell(footer.center)}</div>
                  <div>{renderHFCell(footer.right)}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
