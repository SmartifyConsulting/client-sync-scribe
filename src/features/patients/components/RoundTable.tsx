import { useState, useEffect, useRef } from "react";
import { Users, Send, Loader2, Trash2, MessageCircle, Plus, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface RTTopic {
  id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name: string;
  subject: string;
  body: string;
  created_at: string;
}

interface RTMessage {
  id: string;
  topic_id: string;
  doctor_id: string;
  doctor_name: string;
  content: string;
  created_at: string;
}

interface RoundTableProps {
  patientId: string;
  patientName: string;
  onUnreadCountChange?: (count: number) => void;
  hideHeader?: boolean;
}

export function RoundTable({ patientId, patientName, hideHeader = false }: RoundTableProps) {
  const { toast } = useToast();
  const [topics, setTopics] = useState<RTTopic[]>([]);
  const [messagesByTopic, setMessagesByTopic] = useState<Record<string, RTMessage[]>>({});
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("Doctor");
  const [onlineDoctors, setOnlineDoctors] = useState<Record<string, string>>({});
  const [showCompose, setShowCompose] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [chatInput, setChatInput] = useState<Record<string, string>>({});
  const presenceRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      setCurrentUserName(profile?.full_name || 'Doctor');
    })();
  }, []);

  const loadTopics = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('round_table_topics')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (!error) setTopics((data || []) as RTTopic[]);
    setLoading(false);
  };

  const loadMessages = async (topicId: string) => {
    const { data } = await supabase
      .from('round_table_messages')
      .select('*')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: true });
    setMessagesByTopic((m) => ({ ...m, [topicId]: (data || []) as RTMessage[] }));
  };

  useEffect(() => {
    loadTopics();
  }, [patientId]);

  // Realtime: topics + messages + presence
  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase.channel(`rt_${patientId}`, { config: { presence: { key: currentUserId } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round_table_topics', filter: `patient_id=eq.${patientId}` }, () => loadTopics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round_table_messages' }, (payload: any) => {
        const tId = payload.new?.topic_id || payload.old?.topic_id;
        if (tId) loadMessages(tId);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, Array<{ name: string }>>;
        const online: Record<string, string> = {};
        Object.entries(state).forEach(([uid, metas]) => { online[uid] = metas[0]?.name || 'Doctor'; });
        setOnlineDoctors(online);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ name: currentUserName });
        }
      });
    presenceRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [patientId, currentUserId, currentUserName]);

  const createTopic = async () => {
    if (!subject.trim() || !body.trim() || !currentUserId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('round_table_topics').insert({
        patient_id: patientId, doctor_id: currentUserId, doctor_name: currentUserName,
        subject: subject.trim(), body: body.trim(),
      });
      if (error) throw error;
      setSubject(""); setBody(""); setShowCompose(false);
      toast({ title: "Topic created", description: "Other doctors will be notified." });
      loadTopics();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const sendMessage = async (topicId: string) => {
    const text = (chatInput[topicId] || "").trim();
    if (!text || !currentUserId) return;
    const { error } = await supabase.from('round_table_messages').insert({
      topic_id: topicId, doctor_id: currentUserId, doctor_name: currentUserName, content: text,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setChatInput((c) => ({ ...c, [topicId]: "" }));
  };

  const deleteTopic = async (id: string) => {
    await supabase.from('round_table_topics').delete().eq('id', id);
    loadTopics();
  };

  if (loading) {
    return <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const onlineCount = Object.keys(onlineDoctors).length;

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Round Table — {patientName}</h3>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
            {onlineCount} online
          </div>
        </div>
      )}

      {!showCompose ? (
        <Button size="sm" variant="outline" onClick={() => setShowCompose(true)} className="w-full gap-2">
          <Plus className="h-4 w-4" /> New Topic
        </Button>
      ) : (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-muted/30 p-3">
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea placeholder="Describe the case for the team..." value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[90px]" />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setShowCompose(false); setSubject(""); setBody(""); }}>Cancel</Button>
            <Button size="sm" onClick={createTopic} disabled={submitting || !subject.trim() || !body.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
            </Button>
          </div>
        </div>
      )}

      {topics.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
          No round table topics yet.
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-2" defaultValue={topics.length > 0 ? [topics[0].id] : []}>
          {topics.map((t) => (
            <AccordionItem key={t.id} value={t.id} className="rounded-lg border border-primary/30 bg-card px-3">
              <AccordionTrigger
                onClick={() => { if (!messagesByTopic[t.id]) loadMessages(t.id); }}
                className="hover:no-underline"
              >
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-semibold">{t.subject}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.doctor_name} • {format(new Date(t.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="whitespace-pre-wrap text-xs text-foreground">{t.body}</p>
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    <MessageCircle className="h-4 w-4" /> Live discussion
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {(messagesByTopic[t.id] || []).map((m) => (
                      <div key={m.id} className={`rounded-md p-2 text-xs ${m.doctor_id === currentUserId ? 'bg-primary/10 ml-6' : 'bg-muted mr-6'}`}>
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="font-semibold text-sm">{m.doctor_name}</span>
                          {onlineDoctors[m.doctor_id] && <Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500" />}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {format(new Date(m.created_at), "MMM d, h:mm a")}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <Input
                      placeholder="Reply..."
                      value={chatInput[t.id] || ""}
                      onChange={(e) => setChatInput((c) => ({ ...c, [t.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(t.id); }}
                      className="text-xs h-8"
                    />
                    <Button size="icon" className="h-8 w-8" onClick={() => sendMessage(t.id)}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {t.doctor_id === currentUserId && (
                    <Button size="sm" variant="ghost" className="text-destructive h-7 text-xs" onClick={() => deleteTopic(t.id)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete topic
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
