import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { toastError } from "@/lib/userMessage";

const BUCKET = "holarchelp-incident-photos";
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_EDGE = 1600;

type Photo = {
  id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  uploaded_by: string;
  url?: string;
};

async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob>((res) =>
    canvas.toBlob((b) => res(b ?? file), "image/jpeg", 0.85),
  );
}

export function IncidentPhotos({
  incidentId,
  readOnly = false,
}: {
  incidentId: string;
  readOnly?: boolean;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<Photo | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("holarchelp_incident_photos" as any)
      .select("id, storage_path, caption, created_at, uploaded_by")
      .eq("incident_id", incidentId)
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("load photos", error);
      setLoading(false);
      return;
    }
    const list = ((data ?? []) as unknown) as Photo[];
    // sign URLs in batch
    const signed = await Promise.all(
      list.map(async (p) => {
        const { data: s } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(p.storage_path, 60 * 60);
        return { ...p, url: s?.signedUrl };
      }),
    );
    setPhotos(signed);
    setLoading(false);
  }, [incidentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    setUploading(true);
    let success = 0;
    for (const file of Array.from(files)) {
      try {
        if (file.size > MAX_BYTES * 4) {
          toast.error(t("incidentPhotos.tooLarge", { name: file.name }));
          continue;
        }
        const blob = await compressImage(file);
        if (blob.size > MAX_BYTES) {
          toast.error(t("incidentPhotos.stillTooLarge", { name: file.name }));
          continue;
        }
        const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
        const path = `${incidentId}/${crypto.randomUUID()}.${ext === "jpeg" ? "jpg" : ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false });
        if (upErr) throw upErr;
        const { error: insErr } = await supabase
          .from("holarchelp_incident_photos" as any)
          .insert({ incident_id: incidentId, uploaded_by: user.id, storage_path: path });
        if (insErr) {
          await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
          throw insErr;
        }
        success++;
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? t("incidentPhotos.uploadFailed"));
      }
    }
    setUploading(false);
    if (success > 0) {
      toast.success(t("incidentPhotos.added", { count: success }));
      refresh();
    }
    if (fileRef.current) fileRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  };

  const removePhoto = async (p: Photo) => {
    if (!confirm(t("incidentPhotos.deleteConfirm"))) return;
    const { error } = await supabase
      .from("holarchelp_incident_photos" as any)
      .delete()
      .eq("id", p.id);
    if (error) {
      toastError(error, "We couldn't complete that. Please try again.");
      return;
    }
    await supabase.storage.from(BUCKET).remove([p.storage_path]).catch(() => {});
    toast.success(t("incidentPhotos.removed"));
    refresh();
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          {t("incidentPhotos.title")}
        </h3>
        {!readOnly && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={uploading}
              onClick={() => galleryRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" /> {t("incidentPhotos.upload")}
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {uploading ? t("incidentPhotos.uploading") : t("incidentPhotos.camera")}
            </Button>
          </div>
        )}
      </div>

      {!readOnly && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </>
      )}

      {loading ? (
        <div className="flex h-20 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : photos.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/30 p-6 text-center text-xs text-muted-foreground">
          {t("incidentPhotos.none")} {!readOnly && t("incidentPhotos.tapCamera")}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreview(p)}
              className="group relative aspect-square overflow-hidden rounded-xl border bg-muted"
            >
              {p.url ? (
                <img
                  src={p.url}
                  alt={p.caption ?? t("incidentPhotos.photoAlt")}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  {t("common.loading")}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {preview?.url && (
            <div className="relative bg-black">
              <img
                src={preview.url}
                alt={preview.caption ?? t("incidentPhotos.photoAlt")}
                className="max-h-[80vh] w-full object-contain"
              />
              <button
                onClick={() => setPreview(null)}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white"
                aria-label={t("common.close")}
              >
                <X className="h-4 w-4" />
              </button>
              {!readOnly && user?.id === preview.uploaded_by && (
                <button
                  onClick={() => {
                    const p = preview;
                    setPreview(null);
                    if (p) removePhoto(p);
                  }}
                  className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" /> {t("common.delete")}
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
