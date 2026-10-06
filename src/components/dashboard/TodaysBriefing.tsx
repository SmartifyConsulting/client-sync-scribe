import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Clock, User, Volume2, VolumeX, Loader2, AlertCircle, Play, Pause, Wallet as Pill, Users, MessageCircle, ChevronLeft, ChevronRight, ChevronDown, SkipBack, SkipForward } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, addDays, isSameDay } from "date-fns";
import { DoctorProfileDialog } from "@/components/doctors/DoctorProfileDialog";


interface RoundTableNote {
  patientName: string;
  doctorName: string;
  content: string;
}

interface LinkedDoctor {
  id: string;
  name: string;
  specialty: string | null;
}

interface AppointmentWithHistory {
  id: string;
  patientId: string;
  patientName: string;
  startTime: string;
  formattedTime: string;
  lastSessionSummary: string | null;
  allergies: string | null;
  conditions: string | null;
  lastPrescription: string | null;
  linkedDoctors: LinkedDoctor[];
  unreadRoundTableNotes: RoundTableNote[];
}

export function TodaysBriefing() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<AppointmentWithHistory[]>([]);
  const [viewDoctorId, setViewDoctorId] = useState<string | null>(null);
  const [translatedAppointments, setTranslatedAppointments] = useState<AppointmentWithHistory[] | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isNarrating, setIsNarrating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [segmentAudioUrls, setSegmentAudioUrls] = useState<string[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [segments, setSegments] = useState<{ label: string; text: string }[]>([]);
  const [translatedLabels, setTranslatedLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAppointmentsForDate(selectedDate);
  }, [selectedDate]);

  // Auto-translate briefing content when appointments load
  useEffect(() => {
    if (appointments.length === 0) return;
    const translateBriefingContent = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) return;
        const { data: profileData } = await supabase
          .from('profiles')
          .select('preferred_language')
          .eq('id', user.id)
          .single();
        const lang = (profileData as any)?.preferred_language || 'English';
        if (lang === 'English' || lang === 'en') {
          setTranslatedAppointments(null);
          setTranslatedLabels({});
          return;
        }

        setIsTranslating(true);
        if (!session?.access_token) return;

        const translateText = async (text: string): Promise<string> => {
          try {
            const resp = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-text`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                  'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                },
                body: JSON.stringify({ text, targetLanguage: lang }),
              }
            );
            if (resp.ok) {
              const result = await resp.json();
              return result.translatedText || text;
            }
          } catch (e) {
            console.error('Translation error:', e);
          }
          return text;
        };

        // Translate static labels
        const labelsToTranslate = [
          'Allergies', 'Last session', 'No previous session notes',
          'No appointments scheduled for today.', 'unread note', 'unread notes'
        ];
        const translatedLabelResults = await Promise.all(
          labelsToTranslate.map(l => translateText(l))
        );
        const labelMap: Record<string, string> = {};
        labelsToTranslate.forEach((key, i) => {
          labelMap[key] = translatedLabelResults[i];
        });
        setTranslatedLabels(labelMap);

        // Translate appointment content
        const translated = await Promise.all(
          appointments.map(async (apt) => {
            const [summary, allergies, prescription, ...doctorSpecs] = await Promise.all([
              apt.lastSessionSummary ? translateText(apt.lastSessionSummary) : Promise.resolve(null),
              apt.allergies ? translateText(apt.allergies) : Promise.resolve(null),
              apt.lastPrescription ? translateText(apt.lastPrescription) : Promise.resolve(null),
              ...apt.linkedDoctors.map(d => d.specialty ? translateText(d.specialty) : Promise.resolve(null)),
            ]);

            const translatedNotes = await Promise.all(
              apt.unreadRoundTableNotes.map(async (note) => ({
                ...note,
                content: await translateText(note.content),
              }))
            );

            return {
              ...apt,
              lastSessionSummary: summary,
              allergies,
              lastPrescription: prescription,
              linkedDoctors: apt.linkedDoctors.map((d, i) => ({
                ...d,
                specialty: doctorSpecs[i] || d.specialty,
              })),
              unreadRoundTableNotes: translatedNotes,
            };
          })
        );

        setTranslatedAppointments(translated);
      } catch (err) {
        console.error('Briefing translation failed:', err);
      } finally {
        setIsTranslating(false);
      }
    };
    translateBriefingContent();
  }, [appointments]);

  const isToday = isSameDay(selectedDate, new Date());

  const fetchAppointmentsForDate = async (date: Date) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      // Fetch appointments for selected date
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id, patient_id, title, start_time')
        .eq('user_id', user.id)
        .gte('start_time', dayStart.toISOString())
        .lte('start_time', dayEnd.toISOString())
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
          let lastPrescription: string | null = null;
          let linkedDoctors: LinkedDoctor[] = [];
          let patientUserId: string | null = null;
          let unreadRoundTableNotes: RoundTableNote[] = [];

          if (apt.patient_id) {
            // Get patient info
            const { data: patient } = await supabase
              .from('patients')
              .select('name, allergies, patient_user_id')
              .eq('id', apt.patient_id)
              .maybeSingle();

            if (patient) {
              patientName = patient.name;
              allergies = patient.allergies;
              patientUserId = patient.patient_user_id;
            }

            // Get last session summary
            const { data: lastSession } = await supabase
              .from('sessions')
              .select('summary')
              .eq('patient_id', apt.patient_id)
              .eq('status', 'completed')
              .order('ended_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (lastSession) {
              lastSessionSummary = lastSession.summary;
            }

            // Get last prescription
            const { data: prescription } = await supabase
              .from('prescriptions')
              .select('medication, dosage, frequency')
              .eq('patient_id', apt.patient_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (prescription) {
              lastPrescription = `${prescription.medication} ${prescription.dosage} ${prescription.frequency}`;
            }

            // Get linked doctors for this patient
            if (patientUserId) {
              const { data: accessRecords } = await supabase
                .from('doctor_patient_access')
                .select('doctor_id')
                .eq('patient_user_id', patientUserId)
                .eq('is_active', true);

              if (accessRecords && accessRecords.length > 0) {
                const doctorIds = accessRecords.map(r => r.doctor_id);
                const { data: doctors } = await supabase
                  .from('profiles')
                  .select('id, full_name, specialty')
                  .in('id', doctorIds);

                if (doctors) {
                  linkedDoctors = doctors
                    .filter(d => d.full_name)
                    .map(d => ({
                      id: d.id,
                      name: d.full_name as string,
                      specialty: (d as any).specialty || null
                    }));
              }
            }

            // Get unread round table notes for this patient
            const { data: allNotes } = await supabase
              .from('round_table_notes')
              .select('id, doctor_id, doctor_name, content')
              .eq('patient_id', apt.patient_id)
              .neq('doctor_id', user.id)
              .order('created_at', { ascending: false });

            if (allNotes && allNotes.length > 0) {
              const { data: readNotes } = await supabase
                .from('round_table_reads')
                .select('note_id')
                .eq('doctor_id', user.id);

              const readNoteIds = new Set(readNotes?.map(r => r.note_id) || []);
              
              unreadRoundTableNotes = allNotes
                .filter(note => !readNoteIds.has(note.id))
                .map(note => ({
                  patientName,
                  doctorName: note.doctor_name,
                  content: note.content
                }));
            }
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
            lastPrescription,
            linkedDoctors,
            unreadRoundTableNotes,
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

  const generateBriefingSegments = (): { label: string; text: string }[] => {
    if (appointments.length === 0) {
      return [{ label: "Intro", text: "Good morning. You have no appointments scheduled for today." }];
    }

    const segs: { label: string; text: string }[] = [];

    // Intro segment
    segs.push({
      label: "Intro",
      text: `Good morning. You have ${appointments.length} appointment${appointments.length > 1 ? 's' : ''} scheduled for today.`,
    });

    appointments.forEach((apt, index) => {
      let text = `At ${apt.formattedTime}, you have ${apt.patientName}. `;
      
      if (apt.allergies) {
        text += `Please note: this patient has allergies to ${apt.allergies}. `;
      }
      
      if (apt.lastSessionSummary) {
        text += `From your last session: ${apt.lastSessionSummary} `;
      } else {
        text += `This appears to be a new patient or their first recorded session. `;
      }

      if (apt.lastPrescription) {
        text += `Their most recent prescription was ${apt.lastPrescription}. `;
      }

      if (apt.linkedDoctors.length > 0) {
        const doctorList = apt.linkedDoctors.map(d => 
          d.specialty ? `${d.name} (${d.specialty})` : d.name
        ).join(', ');
        text += `Other doctors on this patient's profile include: ${doctorList}. `;
      }

      if (apt.unreadRoundTableNotes.length > 0) {
        text += `There ${apt.unreadRoundTableNotes.length === 1 ? 'is' : 'are'} ${apt.unreadRoundTableNotes.length} unread Round Table note${apt.unreadRoundTableNotes.length > 1 ? 's' : ''} for this patient. `;
        apt.unreadRoundTableNotes.forEach((note) => {
          text += `${note.doctorName} wrote: ${note.content} `;
        });
      }
      
      if (index === appointments.length - 1) {
        text += "That concludes your briefing for today.";
      }

      segs.push({ label: apt.patientName, text });
    });

    return segs;
  };

  const playSegment = (index: number, urls: string[]) => {
    if (!audioRef.current || index < 0 || index >= urls.length) return;
    setCurrentSegmentIndex(index);
    audioRef.current.src = urls[index];
    audioRef.current.play();
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handleSkipForward = () => {
    if (currentSegmentIndex < segmentAudioUrls.length - 1) {
      playSegment(currentSegmentIndex + 1, segmentAudioUrls);
    }
  };

  const handleSkipBack = () => {
    if (currentSegmentIndex > 0) {
      playSegment(currentSegmentIndex - 1, segmentAudioUrls);
    }
  };

  const handleNarrate = async () => {
    if (isPlaying && !isPaused && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setIsPaused(false);
      return;
    }

    setIsNarrating(true);
    
    try {
      const segs = generateBriefingSegments();
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('narration_voice, preferred_language')
        .eq('id', (await supabase.auth.getSession()).data.session?.user?.id || '')
        .single();
      const selectedVoice = (profileData as any)?.narration_voice || 'shimmer';
      const preferredLang = (profileData as any)?.preferred_language || 'English';

      // Translate segments if language is not English
      let finalSegs = segs;
      if (preferredLang && preferredLang !== 'English' && preferredLang !== 'en') {
        try {
          const { data: { session: authSession } } = await supabase.auth.getSession();
          const translatedSegs = await Promise.all(
            segs.map(async (seg) => {
              const resp = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-text`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authSession?.access_token}`,
                    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  },
                  body: JSON.stringify({ text: seg.text, targetLanguage: preferredLang }),
                }
              );
              if (resp.ok) {
                const result = await resp.json();
                return { ...seg, text: result.translatedText || seg.text };
              }
              return seg;
            })
          );
          finalSegs = translatedSegs;
        } catch (translationErr) {
          console.error('Translation failed, using English:', translationErr);
        }
      }

      setSegments(finalSegs);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      // Generate audio for all segments in parallel
      const audioUrls = await Promise.all(
        finalSegs.map(async (seg) => {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/narrate-briefing`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({ text: seg.text, voice: selectedVoice }),
            }
          );
          if (!response.ok) throw new Error('Failed to generate speech');
          const blob = await response.blob();
          return URL.createObjectURL(blob);
        })
      );

      setSegmentAudioUrls(audioUrls);
      setCurrentSegmentIndex(0);
      setIsNarrating(false);
      playSegment(0, audioUrls);
    } catch (error: any) {
      console.error('Error narrating briefing:', error);
      toast({
        title: "Narration failed",
        description: error.message || "Could not generate audio briefing",
        variant: "destructive",
      });
      setIsNarrating(false);
    }
  };

  const handlePauseResume = () => {
    if (!audioRef.current) return;
    
    if (isPaused) {
      audioRef.current.play();
      setIsPaused(false);
    } else {
      audioRef.current.pause();
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  // Create Audio element once
  useEffect(() => {
    audioRef.current = new Audio();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Update onended handler when segmentAudioUrls changes
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.onended = () => {
      setCurrentSegmentIndex((prev) => {
        const next = prev + 1;
        if (next < segmentAudioUrls.length) {
          setTimeout(() => playSegment(next, segmentAudioUrls), 300);
          return prev;
        }
        setIsPlaying(false);
        setIsPaused(false);
        return prev;
      });
    };
  }, [segmentAudioUrls]);

  if (loading) {
    return (
      <div className="rounded-xl border border-primary bg-card shadow-sm p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      </div>
    );
  }

  const formattedSelectedDate = format(selectedDate, 'd MMMM yyyy');
  const briefingTitle = isToday ? t("briefing.todaysBriefing") : t("briefing.briefingFor", { day: format(selectedDate, 'EEEE') });
  const doneCount = appointments.filter(a => new Date(a.startTime) < new Date()).length;

  return (
    <div data-tour="doctor-briefing" className="rounded-xl border border-primary bg-card shadow-sm">
      <div className="rounded-t-xl bg-primary p-2.5 md:p-3 flex items-center justify-between gap-1 md:gap-2">
        <div className="flex items-center gap-1 md:gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("briefing.previousDay")}
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground hover:bg-white/20"
          >
            <ChevronLeft className="h-3.5 w-3.5 md:h-5 md:w-5" />
          </Button>
          <div className="text-center">
            <h3 className="text-xs md:text-sm font-semibold text-primary-foreground">{briefingTitle}</h3>
            <p className="text-xs md:text-sm text-white">
              <span>{formattedSelectedDate}</span>
              <span className="inline md:hidden"> • {doneCount}/{appointments.length}</span>
              <span className="hidden md:block">{t("briefing.completedOf", { done: doneCount, total: appointments.length })}</span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("briefing.nextDay")}
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground hover:bg-white/20"
          >
            <ChevronRight className="h-3.5 w-3.5 md:h-5 md:w-5" />
          </Button>
        </div>
        <div className="flex flex-col items-center gap-1">
          {isPlaying ? (
            <div className="flex flex-col items-center gap-1">
              {segments.length > 1 && (
                <span className="text-xs md:text-sm text-primary-foreground/80 whitespace-nowrap">
                  {currentSegmentIndex + 1}/{segments.length} — {segments[currentSegmentIndex]?.label}
                </span>
              )}
              <div className="flex items-center gap-1">
              <Button
                size="sm"
                onClick={handleSkipBack}
                disabled={currentSegmentIndex === 0}
                className="bg-white/20 text-white border border-white/30 hover:bg-white/30 text-xs md:text-xs h-6 px-1.5 md:h-7 md:px-2 gap-0.5"
              >
                <SkipBack className="h-2.5 w-2.5 md:h-3 md:w-3" />
              </Button>
              <Button
                size="sm"
                onClick={handlePauseResume}
                className="bg-white/20 text-white border border-white/30 hover:bg-white/30 text-xs md:text-xs h-6 px-1.5 md:h-7 md:px-2 gap-0.5"
              >
                {isPaused ? (
                  <>
                    <Play className="h-2.5 w-2.5 md:h-3 md:w-3" />
                    <span className="hidden md:inline">Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="h-2.5 w-2.5 md:h-3 md:w-3" />
                    <span className="hidden md:inline">Pause</span>
                  </>
                )}
              </Button>
              <Button
                size="sm"
                onClick={handleSkipForward}
                disabled={currentSegmentIndex >= segmentAudioUrls.length - 1}
                className="bg-white/20 text-white border border-white/30 hover:bg-white/30 text-xs md:text-xs h-6 px-1.5 md:h-7 md:px-2 gap-0.5"
              >
                <SkipForward className="h-2.5 w-2.5 md:h-3 md:w-3" />
              </Button>
              <Button
                size="sm"
                onClick={handleStop}
                className="bg-white/20 text-white border border-white/30 hover:bg-white/30 text-xs md:text-xs h-6 px-1.5 md:h-7 md:px-2 gap-0.5"
              >
                <VolumeX className="h-2.5 w-2.5 md:h-3 md:w-3" />
                <span className="hidden md:inline">Stop</span>
              </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleNarrate}
              disabled={isNarrating}
              className="gap-0.5 bg-white text-primary border border-white/50 hover:bg-muted hover:text-primary text-xs md:text-xs h-6 px-1.5 md:h-7 md:px-2"
            >
              {isNarrating ? (
                 <>
                    <Loader2 className="h-2.5 w-2.5 md:h-3 md:w-3 animate-spin" />
                    <span className="hidden md:inline">{t("briefing.preparing")}</span>
                    <span className="md:hidden">...</span>
                 </>
              ) : (
                <>
                   <Volume2 className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  {t("briefing.narrate")}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {isTranslating && (
        <div className="px-4 py-2 flex items-center gap-2 text-xs text-muted-foreground border-b border-border">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("briefing.translating")}
        </div>
      )}

      {appointments.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          {translatedLabels['No appointments scheduled for today.'] || t("briefing.noAppointments")}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {(translatedAppointments || appointments).map((apt, index) => (
            <Collapsible key={apt.id} defaultOpen={index === 0}>
              <div className="p-2" style={{ animationDelay: `${index * 100}ms` }}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center gap-3 hover:bg-muted/50 rounded-lg p-1 -m-1 transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent shrink-0">
                      <User className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        {apt.patientId ? (
                          <Link
                            to={`/patients/${apt.patientId}`}
                            className="font-medium text-primary hover:text-primary/80 hover:underline truncate text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {apt.patientName}
                          </Link>
                        ) : (
                          <span className="font-medium text-primary truncate text-sm">
                            {apt.patientName}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <Clock className="h-4 w-4" />
                          {apt.formattedTime}
                        </span>
                        {apt.allergies && (
                          <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                        )}
                        {apt.unreadRoundTableNotes.length > 0 && (
                          <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-xs px-1.5 py-0.5 rounded-full">
                            {apt.unreadRoundTableNotes.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-2 space-y-2 ml-11">

                  {apt.allergies && (
                    <div className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>{translatedLabels['Allergies'] || 'Allergies'}: {apt.allergies}</span>
                    </div>
                  )}

                  {apt.lastSessionSummary ? (
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{translatedLabels['Last session'] || 'Last session'}: </span>
                        {apt.lastSessionSummary.length > 150 
                          ? apt.lastSessionSummary.substring(0, 150) + '...' 
                          : apt.lastSessionSummary}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {translatedLabels['No previous session notes'] || 'No previous session notes'}
                    </p>
                  )}

                  {apt.lastPrescription && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Pill className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">{apt.lastPrescription}</span>
                    </div>
                  )}

                  {apt.linkedDoctors.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs flex-wrap">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-muted-foreground">
                        {apt.linkedDoctors.map((d, i) => (
                          <span key={d.id || d.name}>
                            {i > 0 && ", "}
                            {d.id ? (
                              <button
                                type="button"
                                onClick={() => setViewDoctorId(d.id)}
                                className="hover:underline hover:text-primary"
                              >
                                {d.name}
                              </button>
                            ) : (
                              d.name
                            )}
                            {d.specialty ? ` (${d.specialty})` : ""}
                          </span>
                        ))}
                      </span>
                    </div>
                  )}

                  {apt.unreadRoundTableNotes.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs">
                        <MessageCircle className="h-4 w-4 text-amber-600" />
                        <span className="font-medium text-amber-600">
                          {apt.unreadRoundTableNotes.length} {apt.unreadRoundTableNotes.length > 1 ? (translatedLabels['unread notes'] || 'unread notes') : (translatedLabels['unread note'] || 'unread note')}
                        </span>
                      </div>
                      {apt.unreadRoundTableNotes.slice(0, 1).map((note, noteIndex) => (
                        <div key={noteIndex} className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-2">
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                            {note.doctorName}
                          </p>
                          <p className="text-xs text-foreground mt-0.5">
                            {note.content.length > 100 ? note.content.substring(0, 100) + '...' : note.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      )}

      <DoctorProfileDialog doctorId={viewDoctorId} onOpenChange={(o) => !o && setViewDoctorId(null)} />
    </div>
  );
}
