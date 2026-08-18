// Stored documents keep the *public* storage URL of their attachment, but the
// buckets holding patient media are private — that URL returns HTTP 400 and the
// image/PDF renders blank. These helpers turn a stored URL back into a signed,
// readable one.

import { supabase } from "@/integrations/supabase/client";

const URL_PATTERN = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?|$)/;

export interface StorageRef {
  bucket: string;
  path: string;
}

/** Extracts { bucket, path } from any Supabase storage URL. */
export function parseStorageUrl(url: string | null | undefined): StorageRef | null {
  if (!url) return null;
  const match = String(url).match(URL_PATTERN);
  if (!match) return null;
  return { bucket: match[1], path: decodeURIComponent(match[2]) };
}

const cache = new Map<string, { url: string; expires: number }>();

/**
 * Returns a signed URL (1 hour) for a stored storage URL. Falls back to the
 * original URL when it is not a storage link or signing is not permitted.
 */
export async function signedMediaUrl(
  url: string | null | undefined,
  expiresIn = 3600,
): Promise<string | null> {
  if (!url) return null;
  const ref = parseStorageUrl(url);
  if (!ref) return url;

  const key = `${ref.bucket}/${ref.path}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.url;

  const { data, error } = await supabase.storage
    .from(ref.bucket)
    .createSignedUrl(ref.path, expiresIn);
  if (error || !data?.signedUrl) return url;

  cache.set(key, { url: data.signedUrl, expires: Date.now() + (expiresIn - 60) * 1000 });
  return data.signedUrl;
}
