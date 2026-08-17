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

/** Deterministic soft tint per doctor so a doctor keeps the same colour everywhere. */
const BUBBLE_TONES = [
  { bubble: "bg-primary/10 text-foreground", avatar: "bg-primary/20 text-primary" },
  { bubble: "bg-blue-500/10 text-foreground", avatar: "bg-blue-500/20 text-blue-700" },
  { bubble: "bg-amber-500/10 text-foreground", avatar: "bg-amber-500/20 text-amber-700" },
  { bubble: "bg-violet-500/10 text-foreground", avatar: "bg-violet-500/20 text-violet-700" },
  { bubble: "bg-rose-500/10 text-foreground", avatar: "bg-rose-500/20 text-rose-700" },
  { bubble: "bg-emerald-500/10 text-foreground", avatar: "bg-emerald-500/20 text-emerald-700" },
];

function bubbleTone(doctorId: string) {
  let hash = 0;
  for (let i = 0; i < (doctorId || "").length; i++) hash = (hash * 31 + doctorId.charCodeAt(i)) >>> 0;
  return BUBBLE_TONES[hash % BUBBLE_TONES.length];
}

function initials(name?: string) {
  const parts = (name || "").replace(/^(dr\.?|prof\.?)\s+/i, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
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
            <AccordionItem key={t.id} value={t.id} className="border-0 bg-card px-3">
              <AccordionTrigger
                onClick={() => { if (!messagesByTopic[t.id]) loadMessages(t.id); }}
                className="hover:no-underline"
              >
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-semibold text-primary">{t.subject}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.doctor_name} • {format(new Date(t.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                {/* Opening message from the doctor who started the round table */}
                <div className="flex items-end gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
                    {initials(t.doctor_name)}
                  </div>
                  <div className="relative max-w-[78%] rounded-2xl rounded-bl-sm bg-primary px-3 py-2 text-xs text-primary-foreground">
                    <div className="mb-0.5 flex items-center gap-1">
                      <span className="text-xs font-semibold">{t.doctor_name}</span>
                      <span className="ml-auto pl-2 text-[10px] opacity-80">
                        {format(new Date(t.created_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                    {editingTopicId === t.id ? (
                      <div className="space-y-1">
                        <Textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="min-h-[70px] bg-background text-xs text-foreground"
                        />
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-6 text-[11px] text-primary-foreground hover:text-primary-foreground" onClick={cancelEdit}>Cancel</Button>
                          <Button size="sm" variant="secondary" className="h-6 text-[11px]" onClick={() => saveTopicEdit(t.id)}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{t.body}</p>
                    )}
                    {t.doctor_id === currentUserId && editingTopicId !== t.id && (
                      <div className="mt-1 flex justify-end gap-1">
                        <button
                          className="rounded p-0.5 opacity-80 hover:opacity-100"
                          aria-label="Edit opening message"
                          onClick={() => { setEditingTopicId(t.id); setEditingMsgId(null); setEditingText(t.body); }}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          className="rounded p-0.5 opacity-80 hover:opacity-100"
                          aria-label="Delete topic"
                          onClick={() => deleteTopic(t.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    <MessageCircle className="h-4 w-4" /> Live discussion
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {(messagesByTopic[t.id] || []).map((m) => {
                      const mine = m.doctor_id === currentUserId;
                      const tone = bubbleTone(m.doctor_id);
                      return (
                        <div key={m.id} className={`group flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${tone.avatar}`}>
                            {initials(m.doctor_name)}
                          </div>
                          <div
                            className={`relative max-w-[78%] rounded-2xl px-3 py-2 text-xs ${tone.bubble} ${
                              mine ? "rounded-br-sm" : "rounded-bl-sm"
                            }`}
                          >
                            <div className="mb-0.5 flex items-center gap-1">
                              <span className="text-xs font-semibold">{m.doctor_name}</span>
                              {onlineDoctors[m.doctor_id] && <Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500" />}
                              <span className="ml-auto pl-2 text-[10px] opacity-70">
                                {format(new Date(m.created_at), "MMM d, h:mm a")}
                                {m.edited_at ? " · edited" : ""}
                              </span>
                            </div>
                            {editingMsgId === m.id ? (
                              <div className="space-y-1">
                                <Textarea
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  className="min-h-[60px] bg-background text-xs"
                                />
                                <div className="flex justify-end gap-1">
                                  <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={cancelEdit}>Cancel</Button>
                                  <Button size="sm" className="h-6 text-[11px]" onClick={() => saveMessageEdit(m)}>Save</Button>
                                </div>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap">{m.content}</p>
                            )}
                            {mine && editingMsgId !== m.id && (
                              <div className="mt-1 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                  className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                                  aria-label="Edit message"
                                  onClick={() => { setEditingMsgId(m.id); setEditingTopicId(null); setEditingText(m.content); }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  className="rounded p-0.5 text-destructive hover:opacity-80"
                                  aria-label="Delete message"
                                  onClick={() => deleteMessage(m)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
