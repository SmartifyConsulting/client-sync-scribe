import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Clock, User, Volume2, VolumeX, Loader2, AlertCircle, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

const VOICE_OPTIONS = [
  { value: "alloy", label: "Alloy", description: "Neutral and balanced" },
  { value: "echo", label: "Echo", description: "Warm and conversational" },
  { value: "fable", label: "Fable", description: "Expressive and dynamic" },
  { value: "onyx", label: "Onyx", description: "Deep and authoritative" },
  { value: "nova", label: "Nova", description: "Friendly and upbeat" },
  { value: "shimmer", label: "Shimmer", description: "Clear and gentle" },
];

interface AppointmentWithHistory {
  id: string;
  patientId: string;
  patientName: string;
  startTime: string;
  formattedTime: string;
  lastSessionSummary: string | null;
  allergies: string | null;
  conditions: string | null;
}

export function TodaysBriefing() {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<AppointmentWithHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNarrating, setIsNarrating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(() => {
    return localStorage.getItem('briefing-voice') || 'alloy';
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchTodaysAppointments();
  }, []);

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    localStorage.setItem('briefing-voice', voice);
  };

  const fetchTodaysAppointments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Fetch today's appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id, patient_id, title, start_time')
        .eq('user_id', user.id)
        .gte('start_time', todayStart.toISOString())
        .lte('start_time', todayEnd.toISOString())
        .order('start_time', { ascending: true });

      if (appointmentsError) throw appointmentsError;

      if (!appointmentsData || appointmentsData.length === 0) {
        setAppointments([]);
        setLoading(false);
        return;
      }

      // Fetch patient details and last session for each appointment
      const enrichedAppointments = await Promise.all(
        appointmentsData.map(async (apt) => {
          let patientName = apt.title || "Unknown Patient";
          let lastSessionSummary: string | null = null;
          let allergies: string | null = null;

          if (apt.patient_id) {
            // Get patient info
            const { data: patient } = await supabase
              .from('patients')
              .select('name, allergies')
              .eq('id', apt.patient_id)
              .single();

            if (patient) {
              patientName = patient.name;
              allergies = patient.allergies;
            }

            // Get last session summary
            const { data: lastSession } = await supabase
              .from('sessions')
              .select('summary')
              .eq('patient_id', apt.patient_id)
              .eq('status', 'completed')
              .order('ended_at', { ascending: false })
              .limit(1)
              .single();

            if (lastSession) {
              lastSessionSummary = lastSession.summary;
            }
          }

          return {
            id: apt.id,
            patientId: apt.patient_id || '',
            patientName,
            startTime: apt.start_time,
            formattedTime: format(parseISO(apt.start_time), 'h:mm a'),
            lastSessionSummary,
            allergies,
            conditions: null,
          };
        })
      );

      setAppointments(enrichedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateBriefingText = () => {
    if (appointments.length === 0) {
      return "Good morning. You have no appointments scheduled for today.";
    }

    let briefing = `Good morning. You have ${appointments.length} appointment${appointments.length > 1 ? 's' : ''} scheduled for today. `;

    appointments.forEach((apt, index) => {
      briefing += `At ${apt.formattedTime}, you have ${apt.patientName}. `;
      
      if (apt.allergies) {
        briefing += `Please note: this patient has allergies to ${apt.allergies}. `;
      }
      
      if (apt.lastSessionSummary) {
        briefing += `From your last session: ${apt.lastSessionSummary} `;
      } else {
        briefing += `This appears to be a new patient or their first recorded session. `;
      }
      
      if (index < appointments.length - 1) {
        briefing += "Next, ";
      }
    });

    briefing += "That concludes your briefing for today.";
    return briefing;
  };

  const handleNarrate = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    setIsNarrating(true);
    
    try {
      const briefingText = generateBriefingText();
      
      const { data, error } = await supabase.functions.invoke('narrate-briefing', {
        body: { text: briefingText, voice: selectedVoice }
      });

      if (error) throw error;

      if (data.audioContent) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
          { type: 'audio/mp3' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
          setIsPlaying(true);
        }
      }
    } catch (error: any) {
      console.error('Error narrating briefing:', error);
      toast({
        title: "Narration failed",
        description: error.message || "Could not generate audio briefing",
        variant: "destructive",
      });
    } finally {
      setIsNarrating(false);
    }
  };

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.onended = () => setIsPlaying(false);
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border p-5 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Today's Briefing</h3>
          <p className="text-sm text-muted-foreground">
            {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} with patient context
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Narrator Voice</Label>
                <Select value={selectedVoice} onValueChange={handleVoiceChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICE_OPTIONS.map((voice) => (
                      <SelectItem key={voice.value} value={voice.value}>
                        <div className="flex flex-col">
                          <span>{voice.label}</span>
                          <span className="text-xs text-muted-foreground">{voice.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNarrate}
            disabled={isNarrating}
            className="gap-2"
          >
            {isNarrating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : isPlaying ? (
              <>
                <VolumeX className="h-4 w-4" />
                Stop
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4" />
                Narrate
              </>
            )}
          </Button>
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          No appointments scheduled for today.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {appointments.map((apt, index) => (
            <div
              key={apt.id}
              className="p-4 space-y-2"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent shrink-0">
                  <User className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={apt.patientId ? `/patients/${apt.patientId}` : '#'}
                      className="font-medium text-foreground hover:text-primary transition-colors truncate"
                    >
                      {apt.patientName}
                    </Link>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                      {apt.formattedTime}
                    </span>
                  </div>
                  
                  {apt.allergies && (
                    <div className="flex items-center gap-1 text-sm text-destructive mt-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Allergies: {apt.allergies}</span>
                    </div>
                  )}
                </div>
              </div>

              {apt.lastSessionSummary ? (
                <div className="ml-13 pl-13 bg-muted/50 rounded-lg p-3 ml-[52px]">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Last session: </span>
                    {apt.lastSessionSummary.length > 200 
                      ? apt.lastSessionSummary.substring(0, 200) + '...' 
                      : apt.lastSessionSummary}
                  </p>
                </div>
              ) : (
                <div className="ml-[52px]">
                  <p className="text-sm text-muted-foreground italic">
                    No previous session notes available
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
