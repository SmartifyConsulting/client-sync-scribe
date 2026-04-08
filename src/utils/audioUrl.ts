import { supabase } from '@/integrations/supabase/client';

/**
 * Get a signed URL for a session audio file.
 * Handles both legacy public URLs and new storage paths.
 */
export async function getSignedAudioUrl(audioUrlOrPath: string): Promise<string | null> {
  // If it's already a full URL (legacy), extract the path
  let storagePath = audioUrlOrPath;
  if (audioUrlOrPath.startsWith('http')) {
    const parts = audioUrlOrPath.split('/session-audio/');
    if (parts[1]) {
      storagePath = decodeURIComponent(parts[1]);
    } else {
      // Can't extract path, return as-is (may fail if bucket is private)
      return audioUrlOrPath;
    }
  }

  const { data, error } = await supabase.storage
    .from('session-audio')
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  if (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }

  return data.signedUrl;
}
