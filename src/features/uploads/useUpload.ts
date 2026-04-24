/**
 * useUpload — single hook for every Supabase Storage bucket in the app.
 *
 * Centralises the scattered `supabase.storage.from(bucket).upload(...)`
 * boilerplate, enforces the 5MB/100MB size policies declared in the
 * project memory, and returns either a public URL (for public buckets)
 * or a signed URL (for private buckets).
 *
 * Existing components keep working unchanged — this hook is offered as
 * the canonical replacement going forward; nothing is forced.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/services/logger";

export type UploadBucket =
  | "logos"
  | "avatars"
  | "patient-media"
  | "session-audio"
  | "cpd-certificates"
  | "health-photos";

export interface UploadOptions {
  /** Default 5 MB. Audio/video uploads are capped at 5MB by policy. */
  maxBytes?: number;
  /** Optional folder prefix prepended to the path. */
  folder?: string;
  /** Cache-Control header for the upload. Defaults to "3600". */
  cacheControl?: string;
  /** Overwrite existing object. Defaults to true. */
  upsert?: boolean;
  /** Signed URL TTL in seconds (private buckets). Defaults to 3600. */
  signedUrlSeconds?: number;
}

export interface UploadResult {
  path: string;
  url: string;
  isPublic: boolean;
}

const PUBLIC_BUCKETS = new Set<UploadBucket>([
  "logos",
  "avatars",
  "patient-media",
]);

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export function useUpload(bucket: UploadBucket, defaults: UploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File | Blob, path: string, options: UploadOptions = {}): Promise<UploadResult | null> => {
      const opts = { ...defaults, ...options };
      const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;

      if (file.size > maxBytes) {
        const msg = `File exceeds limit of ${(maxBytes / 1024 / 1024).toFixed(0)} MB`;
        setError(msg);
        return null;
      }

      const fullPath = opts.folder ? `${opts.folder.replace(/\/$/, "")}/${path}` : path;

      setIsUploading(true);
      setError(null);

      try {
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fullPath, file, {
            cacheControl: opts.cacheControl ?? "3600",
            upsert: opts.upsert ?? true,
          });

        if (uploadError) throw uploadError;

        const isPublic = PUBLIC_BUCKETS.has(bucket);
        let url = "";

        if (isPublic) {
          const { data } = supabase.storage.from(bucket).getPublicUrl(fullPath);
          url = data.publicUrl;
        } else {
          const { data, error: signedError } = await supabase.storage
            .from(bucket)
            .createSignedUrl(fullPath, opts.signedUrlSeconds ?? 3600);
          if (signedError) throw signedError;
          url = data?.signedUrl ?? "";
        }

        logger.debug("[useUpload]", bucket, fullPath, "→", url ? "ok" : "no-url");
        return { path: fullPath, url, isPublic };
      } catch (err: any) {
        const msg = err?.message || "Upload failed";
        logger.error("[useUpload]", bucket, msg);
        setError(msg);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [bucket, defaults],
  );

  return { upload, isUploading, error };
}
