'use client';

import { useEffect, useRef, useState } from 'react';
import { Timer } from 'lucide-react';

interface ProgressTimerProps {
  startTime: number;
  duration: number;
  onComplete?: () => void;
}

export function ProgressTimer({ startTime, duration, onComplete }: ProgressTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const hasCompletedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  // Keep callback ref current on every render without re-running the interval effect
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    hasCompletedRef.current = false;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, duration - elapsed);

      setTimeRemaining(remaining);

      if (remaining === 0 && !hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onCompleteRef.current?.();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, duration]); // only reset when a new turn starts

  const progress = (timeRemaining / duration) * 100;
  const isUrgent = timeRemaining <= 10;
  const isCritical = timeRemaining <= 5;

  const colorClass = isCritical
    ? 'text-destructive'
    : isUrgent
      ? 'text-destructive/80'
      : 'text-primary';

  const barColor = isUrgent ? 'bg-destructive' : 'bg-primary';

  return (
    <div className="space-y-1.5 w-full">
      <div className={`flex items-center justify-center gap-1.5 transition-colors ${colorClass} ${isCritical ? 'animate-pulse' : ''}`}>
        <Timer className="w-4 h-4 flex-shrink-0" />
        <span className="font-bold text-lg tabular-nums leading-none">{timeRemaining}s</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
