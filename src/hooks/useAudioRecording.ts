import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSavingAudio, setIsSavingAudio] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [savedAudioUrl, setSavedAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const endSessionDetectedRef = useRef(false);
  
  // Use refs to always have latest options
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

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

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('session-audio')
        .getPublicUrl(fileName);

      console.log('Audio uploaded successfully:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error in uploadAudioToStorage:', error);
      return null;
    }
  };

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
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        // Create URL for local playback
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
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
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      endSessionDetectedRef.current = false;
      
      // Start Web Speech API for real-time "End Session" detection
      try {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
          const recognition = new SpeechRecognitionAPI();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          
          const endPhrases = ['end session', 'end of session', 'end the session', 'conclude the session', 'session ended'];
          
          recognition.onresult = (event: SpeechRecognitionEvent) => {
            if (endSessionDetectedRef.current) return;
            const last = event.results[event.results.length - 1];
            const text = last[0].transcript.toLowerCase().trim();
            if (endPhrases.some(phrase => text.includes(phrase))) {
              endSessionDetectedRef.current = true;
              console.log('End session detected via Web Speech API:', text);
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
      
      toast({
        title: "Recording Started",
        description: "Speak clearly into your microphone",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

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
        console.log('Sending audio storage URL for transcription');
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
        console.log('Sending audio as base64 for transcription, size:', base64Audio.length);
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
      
      // Append to existing transcript and call callback with latest ref
      setTranscript(prev => {
        const newTranscript = prev ? `${prev}\n\n${transcribedText}` : transcribedText;
        console.log('Calling onTranscriptionComplete with text length:', newTranscript.length);
        optionsRef.current.onTranscriptionComplete?.(newTranscript);
        return newTranscript;
      });

      toast({
        title: "Transcription Complete",
        description: "Audio has been transcribed successfully",
      });
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
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setSavedAudioUrl(null);
  }, [audioUrl]);

  return {
    isRecording,
    isTranscribing,
    isSavingAudio,
    transcript,
    audioUrl,
    savedAudioUrl,
    startRecording,
    stopRecording,
    clearTranscript,
  };
}
