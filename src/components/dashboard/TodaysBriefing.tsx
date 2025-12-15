import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Clock, User, Volume2, VolumeX, Loader2, AlertCircle, Play, Pause, Pill, Users, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, addDays, isSameDay } from "date-fns";


interface RoundTableNote {
  patientName: string;
  doctorName: string;
  content: string;
}

interface LinkedDoctor {
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
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<AppointmentWithHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNarrating, setIsNarrating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchAppointmentsForDate(selectedDate);
  }, [selectedDate]);

  const isToday = isSameDay(selectedDate, new Date());

  const fetchAppointmentsForDate = async (date: Date) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
        // Use sample data for demo purposes - fetch real patient IDs (including demo patients)
        const { data: realPatients } = await supabase
          .from('patients')
          .select('id, name, allergies')
          .limit(3);

        const sampleAppointments: AppointmentWithHistory[] = [
          {
            id: 'sample-1',
            patientId: realPatients?.[0]?.id || '',
            patientName: realPatients?.[0]?.name || 'Sarah Johnson',
            startTime: new Date().toISOString(),
            formattedTime: '9:00 AM',
            lastSessionSummary: 'Patient reported improved sleep patterns after adjusting medication dosage. Anxiety levels have decreased, though work-related stress persists. Recommended continuing current treatment plan with follow-up in two weeks.',
            allergies: realPatients?.[0]?.allergies || 'Penicillin, Sulfa drugs',
            conditions: null,
            lastPrescription: 'Sertraline 50mg daily',
            linkedDoctors: [
              { name: 'Dr. Emily Roberts', specialty: 'Psychiatrist' },
              { name: 'Dr. James Wilson', specialty: 'Cardiologist' }
            ],
            unreadRoundTableNotes: [
              { patientName: realPatients?.[0]?.name || 'Sarah Johnson', doctorName: 'Dr. Emily Roberts', content: 'Patient mentioned considering alternative therapy options. Worth discussing in next session.' }
            ],
          },
          {
            id: 'sample-2',
            patientId: realPatients?.[1]?.id || '',
            patientName: realPatients?.[1]?.name || 'Michael Chen',
            startTime: new Date().toISOString(),
            formattedTime: '10:30 AM',
            lastSessionSummary: 'Follow-up on hypertension management. Blood pressure readings have stabilized with current medication. Patient adherent to low-sodium diet. Continue monitoring.',
            allergies: realPatients?.[1]?.allergies || null,
            conditions: null,
            lastPrescription: 'Lisinopril 10mg daily',
            linkedDoctors: [
              { name: 'Dr. Sarah Thompson', specialty: 'Nephrologist' }
            ],
            unreadRoundTableNotes: [],
          },
          {
            id: 'sample-3',
            patientId: realPatients?.[2]?.id || '',
            patientName: realPatients?.[2]?.name || 'Emma Williams',
            startTime: new Date().toISOString(),
            formattedTime: '2:00 PM',
            lastSessionSummary: null,
            allergies: realPatients?.[2]?.allergies || 'Latex',
            conditions: null,
            lastPrescription: null,
            linkedDoctors: [],
            unreadRoundTableNotes: [],
          },
        ];
        setAppointments(sampleAppointments);
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

      if (apt.lastPrescription) {
        briefing += `Their most recent prescription was ${apt.lastPrescription}. `;
      }

      if (apt.linkedDoctors.length > 0) {
        const doctorList = apt.linkedDoctors.map(d => 
          d.specialty ? `${d.name} (${d.specialty})` : d.name
        ).join(', ');
        briefing += `Other doctors on this patient's profile include: ${doctorList}. `;
      }

      if (apt.unreadRoundTableNotes.length > 0) {
        briefing += `There ${apt.unreadRoundTableNotes.length === 1 ? 'is' : 'are'} ${apt.unreadRoundTableNotes.length} unread Round Table note${apt.unreadRoundTableNotes.length > 1 ? 's' : ''} for this patient. `;
        apt.unreadRoundTableNotes.forEach((note, noteIndex) => {
          briefing += `${note.doctorName} wrote: ${note.content} `;
        });
      }
      
      if (index < appointments.length - 1) {
        briefing += "Next, ";
      }
    });

    briefing += "That concludes your briefing for today.";
    return briefing;
  };

  const handleNarrate = async () => {
    // If playing, stop completely
    if (isPlaying && !isPaused && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setIsPaused(false);
      return;
    }

    setIsNarrating(true);
    
    try {
      const briefingText = generateBriefingText();
      
      // Use streaming fetch for faster playback start
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/narrate-briefing`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: briefingText, voice: 'nova' }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      // Create a MediaSource for streaming playback
      const mediaSource = new MediaSource();
      const audioUrl = URL.createObjectURL(mediaSource);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        
        mediaSource.addEventListener('sourceopen', async () => {
          try {
            const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
            const reader = response.body?.getReader();
            
            if (!reader) throw new Error('No response body');

            // Start playing as soon as we have some data
            let hasStartedPlaying = false;
            
            const processChunk = async () => {
              const { done, value } = await reader.read();
              
              if (done) {
                if (mediaSource.readyState === 'open') {
                  mediaSource.endOfStream();
                }
                return;
              }
              
              // Wait for buffer to be ready
              if (sourceBuffer.updating) {
                await new Promise(resolve => {
                  sourceBuffer.addEventListener('updateend', resolve, { once: true });
                });
              }
              
              sourceBuffer.appendBuffer(value);
              
              // Start playback after first chunk
              if (!hasStartedPlaying && audioRef.current) {
                await new Promise(resolve => {
                  sourceBuffer.addEventListener('updateend', resolve, { once: true });
                });
                audioRef.current.play();
                setIsPlaying(true);
                setIsPaused(false);
                setIsNarrating(false);
                hasStartedPlaying = true;
              }
              
              // Process next chunk
              await processChunk();
            };
            
            await processChunk();
          } catch (err) {
            console.error('Error streaming audio:', err);
            if (mediaSource.readyState === 'open') {
              mediaSource.endOfStream('decode');
            }
          }
        });
      }
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

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.onended = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };
    
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

  const formattedSelectedDate = format(selectedDate, 'd MMMM yyyy');
  const briefingTitle = isToday ? "Today's Briefing" : `Briefing for ${format(selectedDate, 'EEEE')}`;

  return (
    <div className="rounded-xl border border-primary bg-card shadow-sm">
      <div className="rounded-t-xl bg-primary p-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="h-8 w-8 text-primary-foreground hover:bg-white/20"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-primary-foreground">{briefingTitle}</h3>
            <p className="text-sm text-primary-foreground/80">
              {formattedSelectedDate} • {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="h-8 w-8 text-primary-foreground hover:bg-white/20"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePauseResume}
                className="gap-2"
              >
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStop}
                className="gap-2"
              >
                <VolumeX className="h-4 w-4" />
                Stop
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleNarrate}
              disabled={isNarrating}
              className="gap-2 bg-white text-primary border border-white/50 hover:bg-accent hover:text-primary"
            >
              {isNarrating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4" />
                  Narrate
                </>
              )}
            </Button>
          )}
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
                    {apt.patientId ? (
                      <Link
                        to={`/patients/${apt.patientId}`}
                        className="font-medium text-primary hover:underline transition-colors truncate"
                      >
                        {apt.patientName}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground truncate">
                        {apt.patientName}
                      </span>
                    )}
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
                <div className="bg-muted/50 rounded-lg p-3 ml-[52px]">
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

              {apt.lastPrescription && (
                <div className="flex items-center gap-2 ml-[52px] text-sm">
                  <Pill className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">Last prescription: </span>
                    {apt.lastPrescription}
                  </span>
                </div>
              )}

              {apt.linkedDoctors.length > 0 && (
                <div className="flex items-center gap-2 ml-[52px] text-sm">
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">Other doctors: </span>
                    {apt.linkedDoctors.map(d => 
                      d.specialty ? `${d.name} (${d.specialty})` : d.name
                    ).join(', ')}
                  </span>
                </div>
              )}

              {apt.unreadRoundTableNotes.length > 0 && (
                <div className="ml-[52px] mt-2 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MessageCircle className="h-3.5 w-3.5 text-amber-600" />
                    <span className="font-medium text-amber-600">
                      {apt.unreadRoundTableNotes.length} unread Round Table note{apt.unreadRoundTableNotes.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  {apt.unreadRoundTableNotes.slice(0, 2).map((note, noteIndex) => (
                    <div key={noteIndex} className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                        {note.doctorName}
                      </p>
                      <p className="text-sm text-foreground">
                        {note.content.length > 150 ? note.content.substring(0, 150) + '...' : note.content}
                      </p>
                    </div>
                  ))}
                  {apt.unreadRoundTableNotes.length > 2 && (
                    <p className="text-xs text-muted-foreground">
                      +{apt.unreadRoundTableNotes.length - 2} more note{apt.unreadRoundTableNotes.length - 2 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
