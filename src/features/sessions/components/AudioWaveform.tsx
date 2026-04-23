import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AudioWaveformProps {
  isRecording: boolean;
  className?: string;
}

export function AudioWaveform({ isRecording, className }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!isRecording) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Clear canvas when not recording
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    const setupAudioVisualizer = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        source.connect(analyser);
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;

        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const draw = () => {
          if (!isRecording) return;
          
          animationRef.current = requestAnimationFrame(draw);
          
          analyser.getByteFrequencyData(dataArray);
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          const barWidth = (canvas.width / bufferLength) * 2.5;
          let x = 0;
          
          // Get CSS variable for primary color
          const primaryColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--primary').trim();
          
          for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
            
            // Create gradient effect
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
            gradient.addColorStop(0, `hsl(${primaryColor} / 0.3)`);
            gradient.addColorStop(1, `hsl(${primaryColor})`);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
            
            // Add rounded top
            ctx.beginPath();
            ctx.arc(x + barWidth / 2 - 0.5, canvas.height - barHeight, barWidth / 2 - 0.5, Math.PI, 0);
            ctx.fill();
            
            x += barWidth;
          }
        };
        
        draw();

        return () => {
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
        };
      } catch (error) {
        console.error('Error setting up audio visualizer:', error);
      }
    };

    setupAudioVisualizer();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording]);

  return (
    <div className={cn("relative", className)}>
      <canvas
        ref={canvasRef}
        width={300}
        height={60}
        className="w-full h-[60px] rounded-lg bg-muted/30"
      />
      {isRecording && (
        <div className="absolute top-2 left-2 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
          </span>
          <span className="text-xs font-medium text-destructive">REC</span>
        </div>
      )}
    </div>
  );
}
