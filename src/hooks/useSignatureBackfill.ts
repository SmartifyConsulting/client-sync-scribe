import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { renderSignaturePngBase64 } from "@/lib/signatureImage";

/**
 * Email clients strip web fonts, so a typed signature falls back to a generic
 * cursive (Comic Sans in Gmail) whenever we send it as HTML. To guarantee the
 * doctor's chosen script font, the app renders the signature once to a PNG and
 * stores it on the profile — outbound email then embeds that image inline.
 *
 * My Practice does this when the signature is saved, but profiles configured
 * before that existed have no image on file. This hook quietly backfills one
 * the first time such a user opens the app.
 */
export function useSignatureBackfill() {
  const { user } = useAuth();
  const attempted = useRef(false);

  useEffect(() => {
    if (!user?.id || attempted.current) return;
    attempted.current = true;

    (async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select(
            "full_name, signature_url, signature_render_url, signature_font, signature_color, signature_font_size, signature_bold, signature_italic",
          )
          .eq("id", user.id)
          .maybeSingle();

        const p = profile as any;
        if (!p || !p.full_name) return;
        // Already has an uploaded or rendered signature — nothing to do.
        if (p.signature_url || p.signature_render_url) return;

        const base64 = await renderSignaturePngBase64({
          full_name: p.full_name,
          signature_font: p.signature_font,
          signature_color: p.signature_color,
          signature_font_size: p.signature_font_size,
          signature_bold: p.signature_bold,
          signature_italic: p.signature_italic,
        });
        if (!base64) return;

        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const path = `${user.id}/signature.png`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, new Blob([bytes], { type: "image/png" }), {
            upsert: true,
            contentType: "image/png",
          });
        if (upErr) return;

        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        await supabase
          .from("profiles")
          .update({ signature_render_url: `${data.publicUrl}?t=${Date.now()}` } as any)
          .eq("id", user.id);
      } catch {
        /* best effort — never block the app on a signature render */
      }
    })();
  }, [user?.id]);
}
