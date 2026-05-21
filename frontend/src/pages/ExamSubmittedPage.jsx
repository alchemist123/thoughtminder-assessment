import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import useExamSessionStore from '@/store/examSessionStore';

const SECTION_LABEL = {
  quantitative: 'Quantitative Aptitude',
  verbal: 'Verbal',
  technical: 'Technical',
  coding: 'Coding',
};

function formatDuration(totalSeconds) {
  if (totalSeconds == null || totalSeconds < 0) return null;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function ExamSubmittedPage() {
  const { submissionStats, isSubmitted } = useExamSessionStore();

  // Clear any remaining session data on this page (best-effort)
  useEffect(() => {
    try { sessionStorage.removeItem('exam-session'); } catch { /* ignore */ }
  }, []);

  const stats = submissionStats;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      {/* Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-10 w-10 text-green-600" />
      </div>

      {/* Heading */}
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-center">
        Exam Submitted Successfully
      </h1>
      <p className="mb-8 max-w-sm text-center text-muted-foreground">
        Your responses have been recorded. Thank you for participating in the placement drive.
      </p>

      {/* Stats */}
      {stats && (
        <div className="mb-8 w-full max-w-sm space-y-3">
          <div className="rounded-lg border divide-y">
            {/* Questions answered */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">Questions Answered</span>
              <span className="text-sm font-semibold">
                {stats.answeredCount} / {stats.totalCount}
              </span>
            </div>

            {/* Per-section breakdown */}
            {stats.sections?.map((section) => {
              const s = stats.perSection?.[section];
              if (!s) return null;
              return (
                <div key={section} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    {SECTION_LABEL[section] ?? section}
                  </span>
                  <span className="text-sm font-semibold">
                    {s.answered} / {s.total}
                  </span>
                </div>
              );
            })}

            {/* Time taken */}
            {stats.timeTakenSeconds != null && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Time Taken</span>
                <span className="text-sm font-semibold">
                  {formatDuration(stats.timeTakenSeconds)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground text-center max-w-xs">
        Results will be shared by your institution. You may now close this window.
      </p>
    </div>
  );
}
