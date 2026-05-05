import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function VoiceNoteAudio({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage.from("session-audio").createSignedUrl(path, 3600);
      if (!cancelled) setUrl(data?.signedUrl ?? null);
    })();
    return () => { cancelled = true; };
  }, [path]);
  if (!url) return null;
  return <audio controls src={url} className="w-full mt-1" />;
}
