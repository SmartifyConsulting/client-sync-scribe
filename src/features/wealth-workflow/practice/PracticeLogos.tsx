import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { usePracticeInfo } from "./usePracticeInfo";

type Kind = "business_logo_path" | "fsp_logo_path";

/** Signed URLs for a Wealth Manager's two logos (business + FSP). */
export function usePracticeLogoUrls(info: Record<string, any> | null | undefined) {
  return useQuery({
    queryKey: ["practice-logo-urls", info?.business_logo_path, info?.fsp_logo_path],
    enabled: !!info,
    queryFn: async () => {
      const sign = async (p?: string | null) =>
        p ? (await supabase.storage.from("practice-logos").createSignedUrl(p, 3600)).data?.signedUrl ?? null : null;
      return { business: await sign(info?.business_logo_path), fsp: await sign(info?.fsp_logo_path) };
    },
  });
}

function LogoSlot({ kind, title, hint, url }: { kind: Kind; title: string; hint: string; url: string | null }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const save = async (path: string | null) => {
    const { error } = await (supabase as any).from("wealth_practice_info").upsert({ user_id: user!.id, [kind]: path }, { onConflict: "user_id" });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["wealth-practice-info", user!.id] });
  };

  const upload = async (file: File) => {
    if (!/^image\/(png|jpeg|svg\+xml)$/.test(file.type)) return toast({ title: "Unsupported file", description: "Upload a PNG, JPG or SVG logo.", variant: "destructive" });
    if (file.size > 2 * 1024 * 1024) return toast({ title: "Logo too large", description: "Logos must be 2MB or smaller.", variant: "destructive" });
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user!.id}/${kind.replace("_path", "")}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("practice-logos").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      await save(path);
      toast({ title: "Logo saved", description: "It will appear on your client documents." });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message ?? "Please try again.", variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
        {url ? <img src={url} alt={title} className="max-h-20 max-w-[80%] object-contain" /> : <span className="text-xs text-muted-foreground">No logo yet</span>}
      </div>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => ref.current?.click()}>{busy ? "Uploading…" : url ? "Replace" : "Upload"}</Button>
        {url && <Button size="sm" variant="outline" disabled={busy} onClick={() => save(null).catch(() => {})}>Remove</Button>}
      </div>
    </div>
  );
}

export function PracticeLogos() {
  const { user } = useAuth();
  const { data: info } = usePracticeInfo(user?.id);
  const { data: urls } = usePracticeLogoUrls(info ?? {});
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <LogoSlot kind="business_logo_path" title="Business logo" hint="Your own practice, e.g. Elysian. Shown top left on documents." url={urls?.business ?? null} />
      <LogoSlot kind="fsp_logo_path" title="FSP logo" hint="The licensed provider you work under, e.g. Masthead. Shown top right." url={urls?.fsp ?? null} />
    </div>
  );
}
