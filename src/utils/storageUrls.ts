/**
 * Helpers for working with private storage buckets.
 *
 * Buckets like `cpd-certificates` and `health-photos` were migrated from public
 * to private. New uploads should store the storage **path** (e.g.
 * `userId/12345.jpg`) directly in the database column instead of a public URL,
 * but legacy records may still hold full public URLs of the form
 * `https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>`.
 *
 * Use {@link extractStoragePath} to normalise either form into the path the
 * Storage API expects, then {@link getSignedUrl} to mint a short-lived URL.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Given either a storage path (`userId/file.jpg`) or a legacy public URL,
 * return just the path portion within the bucket.
 */
export function extractStoragePath(bucket: string, value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("http")) return value;
  // Look for `/object/public/<bucket>/` or `/object/sign/<bucket>/`
  const marker = new RegExp(`/object/(?:public|sign)/${bucket}/`);
  const match = value.split(marker);
  if (match.length > 1) {
    // Strip any query string from signed URLs
    return match[1].split("?")[0];
  }
  return null;
}

/**
 * Mint a signed URL for a file in a private bucket. Defaults to a 1-hour
 * expiry, which is enough for previews/displays without long-lived link sharing.
 */
export async function getSignedUrl(
  bucket: string,
  pathOrUrl: string | null | undefined,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const path = extractStoragePath(bucket, pathOrUrl);
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) {
    console.error(`Failed to sign ${bucket}/${path}:`, error);
    return null;
  }
  return data.signedUrl;
}
