import { useState, useEffect, useRef, useMemo } from "react";
import { Play, Pause, Download, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CallRecordingPlayerProps {
  /** Unique id for waveform seed */
  callId: string;
  /** Recording duration in seconds */
  duration: number;
  /** Caller display name */
  callerName: string;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Deterministic pseudo-random generator seeded from a string
 * so each call produces a stable, unique-looking waveform.
 */
function seededWave(seedStr: string, bars: number): number[] {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  return Array.from({ length: bars }, (_, i) => {
    // Build a speech-like envelope: bursts of activity with quiet gaps
    const phase = Math.sin((i / bars) * Math.PI * 6) * 0.3 + 0.55;
    const noise = rand() * 0.7 + 0.3;
    return Math.max(0.08, Math.min(1, phase * noise));
  });
}

export function CallRecordingPlayer({ callId, duration, callerName }: CallRecordingPlayerProps) {
  const BAR_COUNT = 64;
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // seconds
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const waveform = useMemo(() => seededWave(callId, BAR_COUNT), [callId, BAR_COUNT]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    lastTickRef.current = performance.now();
    const tick = (now: number) => {
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      setProgress((p) => {
        const next = p + delta;
        if (next >= duration) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, duration]);

  const togglePlay = () => {
    if (progress >= duration) setProgress(0);
    setPlaying((p) => !p);
  };

  const seekTo = (barIndex: number) => {
    const t = (barIndex / (BAR_COUNT - 1)) * duration;
    setProgress(t);
  };

  const playedBars = Math.floor((progress / duration) * BAR_COUNT);

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-3">
        <Button
          size="icon"
          className="h-9 w-9 rounded-full shrink-0 bg-accent hover:bg-accent/90"
          onClick={togglePlay}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </Button>

        {/* Waveform */}
        <div className="flex-1 flex items-center gap-[2px] h-10">
          {waveform.map((amp, i) => (
            <button
              key={i}
              onClick={() => seekTo(i)}
              className="flex-1 h-full flex items-center justify-center group"
              title={`${fmt((i / (BAR_COUNT - 1)) * duration)}`}
            >
              <span
                className={cn(
                  "w-full rounded-full transition-colors",
                  i <= playedBars ? "bg-accent" : "bg-muted-foreground/30",
                  "group-hover:bg-accent/70"
                )}
                style={{ height: `${Math.round(amp * 100)}%` }}
              />
            </button>
          ))}
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground shrink-0 tabular-nums">
          <span className="text-foreground font-medium">{fmt(progress)}</span>
          <span>/</span>
          <span>{fmt(duration)}</span>
        </div>

        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" title="Download recording">
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Volume2 className="h-3 w-3" />
        <span>Recording · {callerName}</span>
      </div>
    </div>
  );
}
