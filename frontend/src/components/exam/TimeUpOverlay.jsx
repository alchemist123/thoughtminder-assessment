import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hourglass, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import api from '@/lib/axios';
import useExamSessionStore from '@/store/examSessionStore';

// 'submitting' | 'done' | 'error'

export function TimeUpOverlay() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('submitting');

  // Capture IDs before submitExam clears the store
  const candidateExamIdRef = useRef(null);
  const examIdRef = useRef(null);

  useEffect(() => {
    const { candidateExam, exam, questions, answers, codeByQuestion, submitExam } =
      useExamSessionStore.getState();

    candidateExamIdRef.current = candidateExam?.id ?? null;
    examIdRef.current = exam?.id ?? null;

    // Best-effort: save any coding answers that have code but were never submitted
    if (candidateExam?.id && questions?.length) {
      for (const q of questions) {
        if (q.type !== 'coding') continue;
        if (answers[q.id]?.code_submitted) continue;
        const code = codeByQuestion?.[q.id];
        if (!code) continue;
        // Pick first non-empty language entry
        const [language, source_code] = Object.entries(code).find(([, v]) => v?.trim()) ?? [];
        if (!source_code) continue;
        api
          .post('/exam/answer', {
            candidate_exam_id: candidateExam.id,
            question_id: q.id,
            code_submission: source_code,
          })
          .catch(() => {/* best-effort */});
      }
    }

    // Main submission
    submitExam().then(() => {
      const { isSubmitted } = useExamSessionStore.getState();
      if (isSubmitted) {
        setPhase('done');
        setTimeout(() => navigate('/exam/submitted', { replace: true }), 3000);
      } else {
        setPhase('error');
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)' }}
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white px-8 py-10 text-center shadow-2xl dark:bg-zinc-900">
        {phase === 'submitting' && (
          <>
            <Hourglass className="mx-auto mb-4 h-16 w-16 text-red-500" />
            <h2 className="mb-2 text-2xl font-bold text-foreground">Time&apos;s Up!</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Your exam time has ended. All your answers have been saved and submitted
              automatically.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting your exam&hellip;
            </div>
          </>
        )}

        {phase === 'done' && (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
            <h2 className="mb-2 text-2xl font-bold text-foreground">
              Exam Submitted Successfully ✓
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Your answers have been recorded. You will be redirected shortly&hellip;
            </p>
            <p className="text-xs text-muted-foreground">Redirecting in 3 seconds&hellip;</p>
          </>
        )}

        {phase === 'error' && (
          <>
            <AlertCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
            <h2 className="mb-2 text-2xl font-bold text-foreground">Submission Failed</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              There was a problem submitting your exam. Please contact your administrator
              immediately.
            </p>
            {candidateExamIdRef.current && (
              <p className="rounded-md bg-muted px-3 py-2 text-xs font-mono text-muted-foreground">
                Session ID: {candidateExamIdRef.current}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
