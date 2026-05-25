import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Send, AlertTriangle, Video, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExamTimer } from '@/components/exam/ExamTimer';
import { SectionNav } from '@/components/exam/SectionNav';
import { QuestionDisplay } from '@/components/exam/QuestionDisplay';
import { CodeEditor } from '@/components/exam/CodeEditor';
import { SubmitDialog } from '@/components/exam/SubmitDialog';
import { TimeUpOverlay } from '@/components/exam/TimeUpOverlay';
import useExamSessionStore, { isAnswered } from '@/store/examSessionStore';
import { useProctoring } from '@/hooks/useProctoring';

const SECTION_LABEL = {
  quantitative: 'Quantitative',
  verbal: 'Verbal',
  technical: 'Technical',
  coding: 'Coding',
};

export function ExamTakePage() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const {
    candidateExam,
    exam,
    questions,
    sections,
    answers,
    currentQuestionId,
    isSubmitted,
    isTimeUp,
    saveAnswer,
    setCurrentQuestion,
  } = useExamSessionStore();

  const [submitOpen, setSubmitOpen] = useState(false);
  const [tabSwitchOverlay, setTabSwitchOverlay] = useState(false);
  const overlayTimeoutRef = useRef(null);

  const { videoRef, cameraReady, isMonitoring, violationCount, sendLog } = useProctoring({
    candidateExamId: candidateExam?.id,
    examId: exam?.id,
  });

  // Guard: if no active session for this exam, redirect back to access page
  useEffect(() => {
    if (!candidateExam || !exam || exam.id !== candidateExam.exam_id) {
      navigate(`/exam/${examId}`, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect on manual submit (TimeUpOverlay handles the time-up path)
  useEffect(() => {
    if (isSubmitted && !isTimeUp) {
      navigate('/exam/submitted', { replace: true });
    }
  }, [isSubmitted, isTimeUp, navigate]);

  // Tab-switch overlay — shown when the window loses focus or tab becomes hidden.
  // Actual malpractice logging is handled inside useProctoring via visibilitychange + blur.
  useEffect(() => {
    const showOverlay = () => {
      setTabSwitchOverlay(true);
      clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = setTimeout(() => setTabSwitchOverlay(false), 3000);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') showOverlay();
    };
    window.addEventListener('blur', showOverlay);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('blur', showOverlay);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimeout(overlayTimeoutRef.current);
    };
  }, []);

  // Block keyboard shortcuts and context menu
  useEffect(() => {
    const onKeyDown = (e) => {
      const blocked =
        (e.ctrlKey && ['t', 'w', 'n'].includes(e.key.toLowerCase())) ||
        e.key === 'F12';
      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onContextMenu = (e) => e.preventDefault();

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('contextmenu', onContextMenu);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('contextmenu', onContextMenu);
    };
  }, []);

  // Camera stream cleanup on unmount
  useEffect(() => {
    return () => {
      const stream = useExamSessionStore.getState().mediaStream;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        useExamSessionStore.getState().setMediaStream(null);
      }
    };
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────────

  const currentQuestion = questions.find((q) => q.id === currentQuestionId) ?? null;
  const currentIndex = questions.findIndex((q) => q.id === currentQuestionId);
  const totalAnswered = questions.filter((q) => isAnswered(answers[q.id])).length;

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentQuestion(questions[currentIndex - 1].id);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1)
      setCurrentQuestion(questions[currentIndex + 1].id);
  };

  if (!exam || !candidateExam) return null;

  return (
    <div
      className="h-screen overflow-hidden bg-background"
      style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
        gridTemplateColumns: '240px 1fr',
      }}
    >
      {/* Hidden proctor video */}
      <video ref={videoRef} muted autoPlay playsInline style={{ display: 'none' }} />

      {/* Time-up overlay — z-9999, rendered above everything */}
      {isTimeUp && <TimeUpOverlay />}

      {/* Tab-switch overlay — z-1000 */}
      {tabSwitchOverlay && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-black/80">
          <AlertTriangle className="mb-3 h-12 w-12 text-yellow-400" />
          <p className="text-lg font-semibold text-white">Tab switch detected</p>
          <p className="mt-1 text-sm text-white/70">This incident has been recorded.</p>
        </div>
      )}
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header
        className="col-span-2 flex items-center justify-between border-b bg-background px-4 py-3"
        style={{ gridColumn: '1 / -1' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="truncate font-semibold text-sm">{exam.title}</span>

          {/* Section progress */}
          <div className="hidden items-center gap-2 sm:flex">
            {sections.map((section) => {
              const sqs = questions.filter((q) => q.section === section);
              const ans = sqs.filter((q) => isAnswered(answers[q.id])).length;
              return (
                <span key={section} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{SECTION_LABEL[section]}</span>{' '}
                  {ans}/{sqs.length}
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/* Camera indicator */}
          <div className="hidden items-center gap-1.5 sm:flex">
            {isMonitoring ? (
              <>
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <Video className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Monitored</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <VideoOff className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Camera Off</span>
              </>
            )}
            {violationCount > 0 && (
              <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                {violationCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="hidden text-xs text-muted-foreground sm:inline">Time</span>
            <ExamTimer />
          </div>

          <Button
            size="sm"
            variant="destructive"
            onClick={() => setSubmitOpen(true)}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Submit
          </Button>
        </div>
      </header>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="overflow-y-auto border-r bg-muted/30">
        <SectionNav
          sections={sections}
          questions={questions}
          answers={answers}
          currentQuestionId={currentQuestionId}
          onSetQuestion={setCurrentQuestion}
        />
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex flex-col overflow-hidden">
        {currentQuestion?.type === 'coding' ? (
          /* Coding question: full-height split-panel editor, no scroll */
          <div className="flex-1 min-h-0">
            <CodeEditor
              question={currentQuestion}
              candidateExamId={candidateExam.id}
              onCodeSubmit={(result) => {
                // saveCodeResult already marks code_submitted=true in the store
                // via the saveCodeResult action; nothing extra needed here.
              }}
            />
          </div>
        ) : (
          /* MCQ / Written: scrollable content + prev/next nav */
          <>
            <div className="flex-1 overflow-y-auto p-6">
              {/* Question header */}
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    Q{currentIndex + 1} of {questions.length}
                  </span>
                  {currentQuestion && (
                    <span className="capitalize rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                      {currentQuestion.type} · {currentQuestion.difficulty}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {totalAnswered} / {questions.length} answered
                </span>
              </div>

              {/* Question + answer UI */}
              <QuestionDisplay
                question={currentQuestion}
                answer={currentQuestion ? answers[currentQuestion.id] : null}
                onAnswer={(answerData) => {
                  if (currentQuestion) saveAnswer(currentQuestion.id, answerData);
                }}
              />
            </div>

            {/* Prev / Next navigation */}
            <div className="flex items-center justify-between border-t px-6 py-3 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={currentIndex <= 0}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>

              <span className="text-xs text-muted-foreground">
                {currentIndex + 1} / {questions.length}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={currentIndex >= questions.length - 1}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </main>

      {/* Submit confirmation dialog */}
      <SubmitDialog open={submitOpen} onOpenChange={setSubmitOpen} />
    </div>
  );
}
