import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import useExamSessionStore, { isAnswered } from '@/store/examSessionStore';

const SECTION_LABEL = {
  quantitative: 'Quantitative Aptitude',
  verbal: 'Verbal',
  technical: 'Technical',
  coding: 'Coding',
};

export function SubmitDialog({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { sections, questions, answers, isSubmitting, submitExam } = useExamSessionStore();
  const [submitting, setSubmitting] = useState(false);

  const totalAnswered = questions.filter((q) => isAnswered(answers[q.id])).length;
  const totalCount = questions.length;

  const perSection = sections.map((section) => {
    const sqs = questions.filter((q) => q.section === section);
    const answered = sqs.filter((q) => isAnswered(answers[q.id])).length;
    return { section, answered, total: sqs.length };
  });

  // Coding-specific gate: every coding question must have test cases run (code_submitted)
  const codingQuestions = questions.filter((q) => q.section === 'coding');
  const codingNotRun = codingQuestions.filter(
    (q) => answers[q.id]?.code_submitted !== true
  ).length;
  const codingBlocked = codingNotRun > 0;

  const hasUnanswered = perSection.some((s) => s.answered < s.total);

  const handleSubmit = async () => {
    if (codingBlocked) return;
    setSubmitting(true);
    try {
      await submitExam();
      navigate('/exam/submitted', { replace: true });
    } catch {
      setSubmitting(false);
    }
  };

  const busy = submitting || isSubmitting;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You have answered{' '}
                <span className="font-semibold text-foreground">
                  {totalAnswered} of {totalCount}
                </span>{' '}
                questions.
              </p>

              {/* Per-section breakdown */}
              <div className="rounded-md border divide-y">
                {perSection.map(({ section, answered, total }) => {
                  const complete = answered === total;
                  const isCoding = section === 'coding';
                  return (
                    <div
                      key={section}
                      className="flex items-center justify-between px-3 py-2"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{SECTION_LABEL[section] ?? section}</span>
                        {isCoding && !complete && (
                          <span className="text-[10px] font-medium text-red-500 bg-red-500/10 rounded px-1.5 py-0.5">
                            test cases required
                          </span>
                        )}
                      </div>
                      <span
                        className={
                          complete
                            ? 'text-xs font-medium text-green-600'
                            : isCoding
                            ? 'text-xs font-medium text-red-600'
                            : 'text-xs font-medium text-amber-600'
                        }
                      >
                        {answered} / {total}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Coding blocker — hard block */}
              {codingBlocked && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/40 dark:bg-red-900/20">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                  <p className="text-xs text-red-700 dark:text-red-300">
                    <span className="font-semibold">Cannot submit yet.</span>{' '}
                    {codingNotRun === 1
                      ? '1 coding question has not had test cases run.'
                      : `${codingNotRun} coding questions have not had test cases run.`}{' '}
                    Go back and click <span className="font-semibold">Run Test Cases</span> for each coding question before submitting.
                  </p>
                </div>
              )}

              {/* General unanswered warning (non-coding) */}
              {!codingBlocked && hasUnanswered && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900/40 dark:bg-amber-900/20">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Some questions are unanswered. Once submitted, you cannot return to the exam.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Review Answers</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={busy || codingBlocked}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Submitting…' : 'Submit Now'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
