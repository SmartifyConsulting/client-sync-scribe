import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseAudioRecordingOptions {
  onTranscriptionComplete?: (text: string) => void;
  onAudioSaved?: (audioUrl: string) => void;
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
        
        // Upload to storage if sessionId is provided
        const currentSessionId = optionsRef.current.sessionId;
        if (currentSessionId) {
          setIsSavingAudio(true);
          const storageUrl = await uploadAudioToStorage(audioBlob, currentSessionId);
          if (storageUrl) {
            setSavedAudioUrl(storageUrl);
            optionsRef.current.onAudioSaved?.(storageUrl);
          }
          setIsSavingAudio(false);
        }
        
        await transcribeAudio(audioBlob);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      
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

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    
    try {
      // Refresh the session token before transcription to avoid 401 on long recordings
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('Token refresh failed, proceeding with existing token:', refreshError.message);
      }

      // Convert blob to base64
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

      console.log('Sending audio for transcription, size:', base64Audio.length);

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { 
          audio: base64Audio,
          patientName: optionsRef.current.patientName,
          doctorName: optionsRef.current.doctorName,
          language: optionsRef.current.language,
        },
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
