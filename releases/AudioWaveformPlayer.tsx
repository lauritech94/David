import { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioWaveformPlayerProps {
  src: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  versionName: string;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function extractPeaks(buffer: AudioBuffer, barCount: number): number[] {
  const channel = buffer.getChannelData(0);
  const samplesPerBar = Math.floor(channel.length / barCount);
  const peaks: number[] = [];

  for (let i = 0; i < barCount; i++) {
    let sum = 0;
    const start = i * samplesPerBar;
    for (let j = start; j < start + samplesPerBar && j < channel.length; j++) {
      sum += Math.abs(channel[j]);
    }
    peaks.push(sum / samplesPerBar);
  }

  // Normalize
  const max = Math.max(...peaks, 0.01);
  return peaks.map(p => p / max);
}

export function AudioWaveformPlayer({ src, isPlaying, onTogglePlay, versionName }: AudioWaveformPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const peaksRef = useRef<number[]>([]);

  const [peaks, setPeaks] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);

  // Decode audio to extract waveform peaks
  useEffect(() => {
    if (!src) return;
    setLoading(true);

    const ac = new AudioContext();
    const controller = new AbortController();

    fetch(src, { signal: controller.signal })
      .then(res => res.arrayBuffer())
      .then(buf => ac.decodeAudioData(buf))
      .then(decoded => {
        const p = extractPeaks(decoded, 200);
        peaksRef.current = p;
        setPeaks(p);
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('Waveform decode error:', err);
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
      ac.close();
    };
  }, [src]);

  // Create / update audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    audio.src = src;
    audio.preload = 'metadata';

    const onLoaded = () => setDuration(audio.duration);
    const onEnded = () => onTogglePlay();
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
    };
  }, [src]);

  // Play / pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Animation loop for current time
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const tick = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying]);

  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || peaks.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = 80;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const barCount = peaks.length;
    const gap = 2;
    const barWidth = Math.max(1, (w - gap * (barCount - 1)) / barCount);
    const progress = duration > 0 ? currentTime / duration : 0;

    // Get CSS colors
    const styles = getComputedStyle(canvas);
    const primaryColor = styles.getPropertyValue('--primary').trim();
    const mutedFgColor = styles.getPropertyValue('--muted-foreground').trim();

    const playedColor = `hsl(${primaryColor})`;
    const unplayedColor = `hsl(${mutedFgColor} / 0.3)`;
    const mirrorPlayedColor = `hsl(${primaryColor} / 0.15)`;
    const mirrorUnplayedColor = `hsl(${mutedFgColor} / 0.08)`;

    const mainHeight = h * 0.65;
    const mirrorHeight = h * 0.25;
    const centerY = mainHeight;

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + gap);
      const peakVal = peaks[i];
      const barH = Math.max(2, peakVal * mainHeight);
      const mirrorH = Math.max(1, peakVal * mirrorHeight);
      const isPlayed = i / barCount <= progress;

      // Main bar (grows upward)
      ctx.fillStyle = isPlayed ? playedColor : unplayedColor;
      ctx.beginPath();
      ctx.roundRect(x, centerY - barH, barWidth, barH, 1);
      ctx.fill();

      // Mirror bar (grows downward)
      ctx.fillStyle = isPlayed ? mirrorPlayedColor : mirrorUnplayedColor;
      ctx.beginPath();
      ctx.roundRect(x, centerY + 2, barWidth, mirrorH, 1);
      ctx.fill();
    }
  }, [peaks, currentTime, duration]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => drawWaveform());
    ro.observe(container);
    return () => ro.disconnect();
  }, [drawWaveform]);

  // Seek on click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio || !duration) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" disabled>
          <Play className="h-4 w-4" />
        </Button>
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
          <div className="h-[80px] w-full bg-muted/30 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 mt-1"
        onClick={onTogglePlay}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-medium truncate">{versionName}</p>
        <div ref={containerRef} className="w-full">
          <canvas
            ref={canvasRef}
            className="w-full cursor-pointer"
            style={{ height: 80 }}
            onClick={handleCanvasClick}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
