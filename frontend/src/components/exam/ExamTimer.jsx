import { useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import useExamSessionStore from '@/store/examSessionStore';

// Module-level guard — only one interval runs at a time, survives React StrictMode
let timerInterval = null;
let timerRunning = false;

function formatTime(totalSeconds) {
  if (totalSeconds == null || totalSeconds < 0) totalSeconds = 0;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ExamTimer() {
  const timeRemaining = useExamSessionStore((s) => s.timeRemaining);

  const isAmber    = timeRemaining != null && timeRemaining <= 600 && timeRemaining > 300; // 5–10 min
  const isRed      = timeRemaining != null && timeRemaining <= 300 && timeRemaining > 60;  // 1–5 min
  const isPulse    = timeRemaining != null && timeRemaining <= 60;                          // < 1 min
  const showIcon   = isAmber || isRed || isPulse;

  // On mount: recalculate timeRemaining from wall-clock to correct for drift/refresh,
  // then start the tick interval.
  useEffect(() => {
    const { durationSeconds, timerStartedAt, isSubmitted } = useExamSessionStore.getState();

    if (durationSeconds != null && timerStartedAt != null && !isSubmitted) {
      const elapsed = Math.floor((Date.now() - timerStartedAt) / 1000);
      const remaining = Math.max(0, durationSeconds - elapsed);
      useExamSessionStore.setState({
        timeRemaining: remaining,
        isTimeUp: remaining === 0,
      });
      if (remaining === 0) return; // already expired — overlay handles it
    }

    if (!timerRunning) {
      timerRunning = true;
      timerInterval = setInterval(() => {
        useExamSessionStore.getState().tick();
      }, 1000);
    }

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        timerRunning = false;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-end leading-none">
      <span className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        Time Remaining
      </span>
      <span
        className={cn(
          'flex items-center gap-1 tabular-nums font-mono text-sm font-semibold',
          isAmber && 'text-amber-500',
          (isRed || isPulse) && 'font-bold text-red-500',
          isPulse && 'animate-pulse'
        )}
        aria-live="off"
        aria-label={`Time remaining: ${formatTime(timeRemaining)}`}
      >
        {showIcon && <Clock className="h-3.5 w-3.5 shrink-0" />}
        {formatTime(timeRemaining)}
      </span>
    </div>
  );
}
