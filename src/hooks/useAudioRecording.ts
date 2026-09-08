import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/services/logger';
import { useToast } from '@/hooks/use-toast';

interface UseAudioRecordingOptions {
  onTranscriptionComplete?: (text: string) => void;
  onAudioSaved?: (audioUrl: string) => void;
  onEndSessionDetected?: () => void;
  patientName?: string;
  doctorName?: string;
  sessionId?: string;
  language?: string;
}

export function useAudioRecording(options: UseAudioRecordingOptions = {}) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSavingAudio, setIsSavingAudio] = useState(false);
  const [transcript, setTranscript] = useState('');
  // Rolling text captured by the Web Speech API while the mic is open. Lets features
  // such as AI Consult work mid-session, before the final transcription runs.
  const [liveTranscript, setLiveTranscript] = useState('');
  const liveTranscriptRef = useRef('');
  // Finalised utterances only — rendered message-by-message so the UI never shows
  // half-written "ghost writer" text while somebody is still speaking.
  const [liveMessages, setLiveMessages] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [savedAudioUrl, setSavedAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const endSessionDetectedRef = useRef(false);
  // Rolling live transcription: a second recorder on the same mic stream that is
  // restarted every ~20s so each blob is a complete, decodable webm file which the
  // transcription service can handle on its own. This is what feeds the live AI
  // clinician — the browser speech recogniser is unreliable and only used for the
  // spoken "end session" cue and the speaking indicator.
  const chunkRecorderRef = useRef<MediaRecorder | null>(null);
  const chunkBufferRef = useRef<Blob[]>([]);
  const chunkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunkingActiveRef = useRef(false);
  const [liveTranscribeError, setLiveTranscribeError] = useState<string | null>(null);

  
  // Use refs to always have latest options
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Always release the microphone when the component using this hook unmounts
  useEffect(() => {
    return () => {
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {}
      try { speechRecognitionRef.current?.stop(); } catch {}
      speechRecognitionRef.current = null;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const uploadAudioToStorage = async (audioBlob: Blob, sessionId: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user for audio upload');
        return null;
      }

      const fileName = `${user.id}/${sessionId}_${Date.now()}.webm`;
      
      const { data, error } = await supabase.storage
        .from('session-audio')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: true,
        });

      if (error) {
        console.error('Error uploading audio:', error);
        return null;
      }

      // Store the file path (not public URL) - bucket is private, use signed URLs to access
      logger.debug('Audio uploaded successfully:', fileName);
      return fileName;
    } catch (error) {
      console.error('Error in uploadAudioToStorage:', error);
      return null;
    }
  };

  const LIVE_CHUNK_MS = 20000;

  const transcribeLiveChunk = useCallback(async (blob: Blob) => {
    if (blob.size < 4000) return; // effectively silence
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: {
          audio: base64,
          patientName: optionsRef.current.patientName,
          doctorName: optionsRef.current.doctorName,
          language: optionsRef.current.language,
        },
      });
      if (error || data?.error) {
        console.warn('Live chunk transcription failed:', error || data?.error);
        setLiveTranscribeError('Live transcription is not keeping up with the consultation.');
        return;
      }
      const text = (data?.text || '').trim();
      if (!text) return;
      setLiveTranscribeError(null);
      liveTranscriptRef.current = `${liveTranscriptRef.current} ${text}`.trim();
      setLiveTranscript(liveTranscriptRef.current);
      setLiveMessages((prev) => [...prev, text]);
    } catch (e) {
      console.warn('Live chunk transcription error:', e);
      setLiveTranscribeError('Live transcription could not be reached.');
    }
  }, []);

  const runChunkCycle = useCallback(() => {
    const stream = streamRef.current;
    if (!chunkingActiveRef.current || !stream) return;
    try {
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunkBufferRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunkBufferRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunkBufferRef.current, { type: 'audio/webm' });
        chunkBufferRef.current = [];
        void transcribeLiveChunk(blob);
        if (chunkingActiveRef.current) runChunkCycle();
      };
      recorder.start();
      chunkRecorderRef.current = recorder;
      chunkTimerRef.current = setTimeout(() => {
        try {
          if (recorder.state !== 'inactive') recorder.stop();
        } catch {}
      }, LIVE_CHUNK_MS);
    } catch (e) {
      console.warn('Live chunk recorder failed to start:', e);
      chunkingActiveRef.current = false;
    }
  }, [transcribeLiveChunk]);

  const startLiveChunking = useCallback(() => {
    if (chunkingActiveRef.current) return;
    chunkingActiveRef.current = true;
    runChunkCycle();
  }, [runChunkCycle]);

  const stopLiveChunking = useCallback((flush = true) => {
    chunkingActiveRef.current = false;
    if (chunkTimerRef.current) {
      clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    const recorder = chunkRecorderRef.current;
    chunkRecorderRef.current = null;
    if (recorder && recorder.state !== 'inactive') {
      if (!flush) recorder.ondataavailable = null as any;
      try { recorder.stop(); } catch {}
    }
  }, []);


  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Release the microphone immediately — the recorded chunks are already buffered.
        releaseStream();

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

        // Create URL for local playback
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        try {
          // Upload to storage first if sessionId is provided, then use storage URL for transcription
          const currentSessionId = optionsRef.current.sessionId;
          let storageUrl: string | null = null;
          if (currentSessionId) {
            setIsSavingAudio(true);
            storageUrl = await uploadAudioToStorage(audioBlob, currentSessionId);
            if (storageUrl) {
              setSavedAudioUrl(storageUrl);
              optionsRef.current.onAudioSaved?.(storageUrl);
            }
            setIsSavingAudio(false);
          }

          // Use storage URL if available (avoids large base64 payload), otherwise fall back to blob
          await transcribeAudio(audioBlob, storageUrl);
        } finally {
          // Safety net: make sure the mic is never left open
          releaseStream();
        }
      };

      mediaRecorder.start(1000);
      setLiveTranscribeError(null);
      // Rolling live transcription feeds the AI clinician while the doctor talks.
      startLiveChunking();

      setIsRecording(true);
      endSessionDetectedRef.current = false;
      liveTranscriptRef.current = '';
      setLiveTranscript('');
      setLiveMessages([]);
      setIsSpeaking(false);
      
      // Start Web Speech API for real-time "End Session" detection
      try {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
          const recognition = new SpeechRecognitionAPI();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = optionsRef.current.language || 'en-US';

          
          const endPhrases = ['end session', 'end of session', 'end the session', 'conclude the session', 'session ended'];
          
          recognition.onresult = (event: SpeechRecognitionEvent) => {
            const last = event.results[event.results.length - 1];
            if (last.isFinal) {
              const finalText = last[0].transcript.trim();
              if (finalText) {
                liveTranscriptRef.current = `${liveTranscriptRef.current} ${finalText}`.trim();
                setLiveTranscript(liveTranscriptRef.current);
                setLiveMessages((prev) => [...prev, finalText]);
              }
              setIsSpeaking(false);
              if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
            } else {
              // Somebody is mid-sentence: show an indicator, never the partial text.
              setIsSpeaking(true);
              if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
              speakingTimerRef.current = setTimeout(() => setIsSpeaking(false), 2500);
            }
            if (endSessionDetectedRef.current) return;
            const text = last[0].transcript.toLowerCase().trim();
            if (endPhrases.some(phrase => text.includes(phrase))) {
              endSessionDetectedRef.current = true;
              logger.debug('End session detected via Web Speech API:', text);
              optionsRef.current.onEndSessionDetected?.();
              recognition.stop();
            }
          };
          
          recognition.onerror = (e) => {
            console.warn('SpeechRecognition error:', e);
          };
          
          recognition.onend = () => {
            // Restart if still recording and not ended
            if (!endSessionDetectedRef.current && mediaRecorderRef.current?.state === 'recording') {
              try { recognition.start(); } catch {} 
            }
          };
          
          recognition.start();
          speechRecognitionRef.current = recognition;
        }
      } catch (err) {
        console.warn('Web Speech API not available:', err);
      }
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [toast, releaseStream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      // Resume first if paused so onstop fires correctly
      if (mediaRecorderRef.current.state === 'paused') {
        try { mediaRecorderRef.current.resume(); } catch {}
      }
      mediaRecorderRef.current.stop();
      // Flush the final live chunk before the mic closes.
      stopLiveChunking(true);
      // Free the microphone right away so the browser tab indicator clears
      releaseStream();

      setIsRecording(false);
      setIsPaused(false);
      // Stop speech recognition
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch {}
        speechRecognitionRef.current = null;
      }
    }
  }, [isRecording, releaseStream]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      try {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        stopLiveChunking(true);
        if (speechRecognitionRef.current) {
          try { speechRecognitionRef.current.stop(); } catch {}
        }
      } catch (err) {
        console.error('Pause failed:', err);
      }
    }
  }, [stopLiveChunking]);


  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      try {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        startLiveChunking();
        // Restart speech recognition

        try {
          const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (SpeechRecognitionAPI && !speechRecognitionRef.current) {
            const recognition = new SpeechRecognitionAPI();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = optionsRef.current.language || 'en-US';
            recognition.onresult = (event: SpeechRecognitionEvent) => {
              const last = event.results[event.results.length - 1];
              if (!last.isFinal) {
                setIsSpeaking(true);
                if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
                speakingTimerRef.current = setTimeout(() => setIsSpeaking(false), 2500);
                return;
              }
              setIsSpeaking(false);
              const finalText = last[0].transcript.trim();
              if (!finalText) return;
              liveTranscriptRef.current = `${liveTranscriptRef.current} ${finalText}`.trim();
              setLiveTranscript(liveTranscriptRef.current);
              setLiveMessages((prev) => [...prev, finalText]);
            };
            recognition.start();
            speechRecognitionRef.current = recognition;
          }
        } catch {}
      } catch (err) {
        console.error('Resume failed:', err);
      }
    }
  }, [startLiveChunking]);


  const transcribeAudio = async (audioBlob: Blob, storageUrl?: string | null) => {
    setIsTranscribing(true);
    
    try {
      // Refresh the session token before transcription to avoid 401 on long recordings
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('Token refresh failed, proceeding with existing token:', refreshError.message);
      }

      let body: Record<string, unknown>;

      if (storageUrl) {
        // Send storage URL instead of large base64 payload
        logger.debug('Sending audio storage URL for transcription');
        body = {
          audioUrl: storageUrl,
          patientName: optionsRef.current.patientName,
          doctorName: optionsRef.current.doctorName,
          language: optionsRef.current.language,
        };
      } else {
        // Fallback: convert blob to base64 for short recordings without storage
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(audioBlob);
        const base64Audio = await base64Promise;
        logger.debug('Sending audio as base64 for transcription, size:', base64Audio.length);
        body = {
          audio: base64Audio,
          patientName: optionsRef.current.patientName,
          doctorName: optionsRef.current.doctorName,
          language: optionsRef.current.language,
        };
      }

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body,
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const transcribedText = data?.text || '';
      
      // Set transcript directly (no append — each transcription is the full result)
      setTranscript(transcribedText);
      logger.debug('Calling onTranscriptionComplete with text length:', transcribedText.length);
      optionsRef.current.onTranscriptionComplete?.(transcribedText);

      // No "Transcription Complete" toast — the session screen shows a single
      // centred progress dialog instead.

    } catch (error: any) {
      console.error('Transcription error:', error);
      toast({
        title: "Transcription Failed",
        description: error.message || "Failed to transcribe audio",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const clearTranscript = useCallback(() => {
    setTranscript('');
    liveTranscriptRef.current = '';
    setLiveTranscript('');
    setLiveMessages([]);
    setIsSpeaking(false);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setSavedAudioUrl(null);
  }, [audioUrl]);

  return {
    isRecording,
    isPaused,
    isTranscribing,
    isSavingAudio,
    transcript,
    liveTranscript,
    liveMessages,
    isSpeaking,
    audioUrl,
    savedAudioUrl,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearTranscript,
  };
}
