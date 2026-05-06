import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LiveMap } from "../components/LiveMap";
import { VoiceNoteAudio } from "../components/VoiceNoteAudio";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useLocationTracking } from "../hooks/useLocationTracking";
import { useAuth } from "@/hooks/useAuth";
import { buildSosMessage, waLink } from "../lib/whatsapp";

type Loc = { latitude: number; longitude: number; recorded_at: string };

export default function HolarcHelpIncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [incident, setIncident] = useState<any | null>(null);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const [profileName, setProfileName] = useState("Your contact");

  useEffect(() => {
    if (!id) return;
    const refetchIncident = () =>
      supabase.from("holarchelp_incidents" as any).select("*").eq("id", id).maybeSingle()
        .then(({ data }) => setIncident(data));
    refetchIncident();
    supabase.from("holarchelp_locations" as any).select("latitude, longitude, recorded_at")
      .eq("incident_id", id).order("recorded_at", { ascending: false }).limit(200)
      .then(({ data }) => setLocations((data as any) ?? []));
    if (user) {
      supabase.from("holarchelp_emergency_contacts" as any).select("id, name, phone").eq("user_id", user.id)
        .then(({ data }) => setContacts((data as any) ?? []));
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
        .then(({ data }) => { if (data?.full_name) setProfileName(data.full_name); });
    }

    const ch = supabase.channel(`holarchelp-incident-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "holarchelp_locations", filter: `incident_id=eq.${id}` },
        (p) => setLocations((prev) => [p.new as any, ...prev].slice(0, 200)))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "holarchelp_incidents", filter: `id=eq.${id}` },
        (p) => setIncident((prev: any) => ({ ...(prev ?? {}), ...(p.new as any) })))
      .subscribe();

    const onFocus = () => refetchIncident();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      supabase.removeChannel(ch);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [id, user]);

  useLocationTracking(id ?? null, !!incident && incident.status === "active");

  const trackingUrl = incident ? `${window.location.origin}/track/${incident.tracking_token}` : "";
  const message = buildSosMessage(profileName, trackingUrl);

  const copy = async () => { await navigator.clipboard.writeText(trackingUrl); toast.success("Tracking link copied"); };

  const resolve = async () => {
    if (!id) return;
    const { error } = await supabase.from("holarchelp_incidents" as any)
      .update({ status: "resolved", resolved_at: new Date().toISOString() } as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Incident resolved");
    navigate("/patient/holarchelp");
  };

  if (!incident) return <div className="p-5 text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">{incident.status === "active" ? "Active emergency" : "Resolved incident"}</h1>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${incident.status === "active" ? "bg-sos/10 text-sos" : "bg-secondary text-primary"}`}>
          {incident.status.toUpperCase()}
        </span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">Started {new Date(incident.created_at).toLocaleString()}</p>

      <LiveMap points={locations} />

      {(incident.voice_note_transcript || incident.voice_note_audio_url) && (
        <div className="mt-4 rounded-2xl border-2 border-red-600/40 bg-red-50 dark:bg-red-950/20 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">Your voice note</p>
          {incident.voice_note_transcript && (
            <p className="text-sm whitespace-pre-wrap mb-2">{incident.voice_note_transcript}</p>
          )}
          {incident.voice_note_audio_url && <VoiceNoteAudio path={incident.voice_note_audio_url} />}
        </div>
      )}

      {incident.status === "active" && contacts.length > 0 && (
        <div className="mt-4 rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notify contacts on WhatsApp</p>
          <ul className="mt-3 space-y-2">
            {contacts.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                <div><p className="font-semibold">{c.name}</p><p className="text-xs text-muted-foreground">{c.phone ?? "No number"}</p></div>
                {c.phone && (
                  <Button asChild size="sm" className="gap-1.5 bg-[#25D366] text-white hover:bg-[#1ea952]">
                    <a href={waLink(c.phone, message)} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live tracking link</p>
        <p className="mt-1 break-all text-sm">{trackingUrl}</p>
        <Button onClick={copy} variant="outline" size="sm" className="mt-3 gap-2 rounded-xl"><Copy className="h-4 w-4" /> Copy link</Button>
      </div>

      {incident.status === "active" && (
        <Button onClick={resolve} className="mt-6 h-14 w-full gap-2 rounded-2xl bg-primary text-base font-semibold">
          <CheckCircle2 className="h-5 w-5" /> Mark as resolved
        </Button>
      )}
    </div>
  );
}
