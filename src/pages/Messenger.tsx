import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MessageThread } from "@/features/messenger/MessageThread";

interface Thread { patientId: string; advisorId: string | null; advisorName: string; clientName: string; unread: number; last?: string }

/** In-app, audited chat between a client and their Wealth Manager. */
export default function Messenger() {
  const [me, setMe] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)); }, []);

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["messenger-threads", me],
    enabled: !!me,
    refetchInterval: 15000,
    queryFn: async (): Promise<Thread[]> => {
      const { data: pts } = await (supabase as any).from("patients")
        .select("id, full_name, user_id, patient_user_id")
        .or(`patient_user_id.eq.${me},and(user_id.eq.${me},patient_user_id.not.is.null)`)
        .order("full_name");
      const rows = (pts ?? []) as any[];
      const advisorIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
      const { data: profs } = advisorIds.length ? await supabase.from("profiles").select("id, full_name").in("id", advisorIds) : { data: [] as any[] };
      const pIds = rows.map((r) => r.id);
      const { data: msgs } = pIds.length ? await (supabase as any).from("wealth_messages").select("patient_id, sender_id, read_at, body, created_at").in("patient_id", pIds).order("created_at", { ascending: false }) : { data: [] };
      return rows.map((r) => {
        const own = (msgs ?? []).filter((m: any) => m.patient_id === r.id);
        return {
          patientId: r.id, advisorId: r.user_id,
          advisorName: (profs ?? []).find((p: any) => p.id === r.user_id)?.full_name || "Wealth Manager",
          clientName: r.full_name || "Client",
          unread: own.filter((m: any) => !m.read_at && m.sender_id !== me).length,
          last: own[0]?.body,
        };
      });
    },
  });

  const isClient = threads.length > 0 && threads.every((t) => t.advisorId !== me);
  const filtered = useMemo(() => threads.filter((t) => (isClient ? t.advisorName : t.clientName).toLowerCase().includes(q.toLowerCase())), [threads, q, isClient]);
  useEffect(() => { if (!active && threads[0]) setActive(threads[0].patientId); }, [threads, active]);
  const current = threads.find((t) => t.patientId === active);

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] w-full max-w-6xl flex-col gap-3 p-3 md:p-4">
      <div>
        <h1 className="page-title">Messenger</h1>
        <p className="text-sm text-muted-foreground">
          {isClient ? "Chat with your Wealth Manager here. Every message is kept on record." : "Chat with your clients here instead of WhatsApp. Every message is kept on record."}
        </p>
      </div>
      <div className="frame grid min-h-0 flex-1 overflow-hidden md:grid-cols-[280px_1fr]">
        <aside className={cn("min-h-0 border-b border-border md:border-b-0 md:border-r", isClient && threads.length <= 1 && "hidden md:block")}>
          <div className="relative p-2">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="pl-8" />
          </div>
          <ul className="max-h-48 overflow-y-auto md:max-h-none">
            {isLoading && <li className="p-3 text-xs text-muted-foreground">Loading…</li>}
            {!isLoading && filtered.length === 0 && <li className="p-3 text-xs text-muted-foreground">No conversations yet. Clients appear here once they've joined.</li>}
            {filtered.map((t) => (
              <li key={t.patientId}>
                <button onClick={() => setActive(t.patientId)}
                  className={cn("flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/60", active === t.patientId && "bg-muted")}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {(isClient ? t.advisorName : t.clientName).split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{isClient ? t.advisorName : t.clientName}</span>
                    <span className="block truncate text-xs text-muted-foreground">{t.last ?? "No messages yet"}</span>
                  </span>
                  {t.unread > 0 && <span className="rounded-full bg-primary px-1.5 text-2xs font-semibold text-primary-foreground">{t.unread}</span>}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section className="flex min-h-0 flex-col p-3">
          {current ? (
            <>
              <div className="mb-2 flex items-center gap-2 border-b border-border pb-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{isClient ? current.advisorName : current.clientName}</span>
              </div>
              <MessageThread key={current.patientId} patientId={current.patientId} advisorUserId={current.advisorId}
                names={{ advisor: current.advisorName.split(" ")[0], client: current.clientName.split(" ")[0] }} />
            </>
          ) : (
            <p className="m-auto text-sm text-muted-foreground">Select a conversation.</p>
          )}
        </section>
      </div>
    </div>
  );
}
