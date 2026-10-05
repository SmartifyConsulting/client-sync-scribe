import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";

const db = supabase as any;

const DEFAULT_INSURERS = [
  "Old Mutual", "Sanlam", "Discovery", "Momentum", "Liberty", "Santam", "Hollard",
  "Outsurance", "King Price", "Auto & General", "MiWay", "Budget Insurance",
  "1Life", "Clientele", "PSG Insure", "Absa Insurance", "Standard Bank Insurance",
  "FNB Insurance", "Bryte Insurance", "Guardrisk",
];

/** Every insurer a broker requests quotes from, and the address those
 *  requests go to. Seeded with a default list of SA insurers on first visit. */
export default function QuotesScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [seeded, setSeeded] = useState(false);

  const contacts = useQuery({
    queryKey: ["wealth-insurer-contacts", user?.id],
    enabled: !!user,
    queryFn: async () => (await db.from("wealth_insurer_contacts").select("*").eq("broker_user_id", user!.id).order("sort_order")).data ?? [],
  });

  useEffect(() => {
    if (!user || seeded || contacts.isLoading || (contacts.data?.length ?? 0) > 0) return;
    setSeeded(true);
    db.from("wealth_insurer_contacts").insert(
      DEFAULT_INSURERS.map((name, i) => ({ broker_user_id: user.id, insurer_name: name, sort_order: i })),
    ).then(() => qc.invalidateQueries({ queryKey: ["wealth-insurer-contacts"] }));
  }, [user, seeded, contacts.isLoading, contacts.data, qc]);

  const saveAddress = async (id: string, value: string) => {
    const { error } = await db.from("wealth_insurer_contacts").update({ request_address: value.trim() || null }).eq("id", id);
    if (error) return toast.error("Couldn't save. Please try again.");
    qc.invalidateQueries({ queryKey: ["wealth-insurer-contacts"] });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader title="Quotes" subtitle="Insurers you request quotes from, and the address each request is sent to." />

      <div className="rounded-xl border border-border bg-card divide-y">
        {contacts.isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : !contacts.data?.length ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No insurers yet.</p>
        ) : (
          contacts.data.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <p className="text-sm font-medium text-foreground">{c.insurer_name}</p>
              <Input
                className="h-8 w-64 text-xs"
                type="email"
                placeholder="quotes@insurer.co.za"
                value={edited[c.id] ?? (c.request_address ?? "")}
                onChange={(e) => setEdited((v) => ({ ...v, [c.id]: e.target.value }))}
                onBlur={(e) => saveAddress(c.id, e.target.value)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
