import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, MinusCircle, Loader2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MalpracticeDrawer } from '@/components/admin/MalpracticeDrawer';
import { getCandidateReview, gradeWrittenAnswer } from '@/services/proctorService';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECTION_LABEL = {
  quantitative: 'Quantitative Aptitude',
  verbal:       'Verbal',
  technical:    'Technical',
  coding:       'Coding',
};

const SECTION_ORDER = ['quantitative', 'verbal', 'technical', 'coding'];

const MONACO_LANG = { python: 'python', javascript: 'javascript', cpp: 'cpp' };

function fmtDuration(startedAt, submittedAt) {
  if (!startedAt || !submittedAt) return '—';
  const secs = Math.floor((new Date(submittedAt) - new Date(startedAt)) / 1000);
  if (secs < 0) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

// ── Question cards ────────────────────────────────────────────────────────────

function DifficultyBadge({ difficulty }) {
  const styles = {
    easy:   'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    hard:   'bg-red-100 text-red-700',
  };
  return difficulty ? (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', styles[difficulty] ?? 'bg-muted text-muted-foreground')}>
      {difficulty}
    </span>
  ) : null;
}

function McqCard({ num, sub }) {
  const q = sub.question;
  const a = sub.answer;
  const options = Array.isArray(q.options) ? q.options : [];
  const selected = a.selected_option ?? null;
  const correct  = q.correct_answer ?? null;
  const isCorrect = a.is_correct;
  const notAttempted = selected == null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Q{num}
            </span>
            <Badge variant="outline" className="text-xs capitalize">{q.section}</Badge>
            <DifficultyBadge difficulty={q.difficulty} />
          </div>
          {notAttempted ? (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              <MinusCircle className="h-3 w-3" /> Not Attempted
            </span>
          ) : isCorrect ? (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              <CheckCircle2 className="h-3 w-3" /> Correct ✓
            </span>
          ) : (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
              <XCircle className="h-3 w-3" /> Incorrect ✗
            </span>
          )}
        </div>
        <p className="mt-2 text-sm leading-relaxed">{q.question_text}</p>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {options.map((opt, i) => {
          const isSelected = opt === selected;
          const isCorrectOpt = opt === correct;
          return (
            <div
              key={i}
              className={cn(
                'flex items-start gap-2 rounded-md border px-3 py-2 text-sm',
                isSelected && !isCorrectOpt && 'border-blue-400 bg-blue-50',
                isCorrectOpt && 'border-green-400 bg-green-50',
              )}
            >
              <span className="shrink-0 font-mono text-xs text-muted-foreground mt-0.5">
                {String.fromCharCode(65 + i)}.
              </span>
              <span className="flex-1">{opt}</span>
              {isSelected && !isCorrectOpt && (
                <span className="shrink-0 text-xs font-medium text-blue-600">Your answer</span>
              )}
              {isCorrectOpt && (
                <span className="shrink-0 text-xs font-medium text-green-600">✓ Correct</span>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function WrittenCard({ num, sub, onGrade }) {
  const q = sub.question;
  const a = sub.answer;
  const notAttempted = !a.answer_text?.trim();
  const [grading, setGrading] = useState(false);
  const [localCorrect, setLocalCorrect] = useState(a.is_correct ?? null);

  const handleGrade = async (isCorrect) => {
    setGrading(true);
    try {
      await onGrade(q.id, isCorrect);
      setLocalCorrect(isCorrect);
    } finally {
      setGrading(false);
    }
  };

  return (
    <Card className={cn(
      localCorrect === true && 'border-green-300',
      localCorrect === false && 'border-red-300',
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Q{num}</span>
            <Badge variant="outline" className="text-xs capitalize">{q.section}</Badge>
            <DifficultyBadge difficulty={q.difficulty} />
          </div>
          {notAttempted ? (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              <MinusCircle className="h-3 w-3" /> Not Attempted
            </span>
          ) : localCorrect === true ? (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              <CheckCircle2 className="h-3 w-3" /> Correct ✓
            </span>
          ) : localCorrect === false ? (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
              <XCircle className="h-3 w-3" /> Incorrect ✗
            </span>
          ) : (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              Pending Review
            </span>
          )}
        </div>
        <p className="mt-2 text-sm leading-relaxed">{q.question_text}</p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Candidate's Answer</p>
          <div className="min-h-[60px] rounded-md border bg-muted/40 px-3 py-2">
            {a.answer_text ? (
              <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{a.answer_text}</pre>
            ) : (
              <span className="text-sm text-muted-foreground italic">No answer provided</span>
            )}
          </div>
        </div>

        {q.correct_answer && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Model Answer</p>
            <div className="min-h-[60px] rounded-md border border-green-200 bg-green-50 px-3 py-2">
              <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed text-green-900">{q.correct_answer}</pre>
            </div>
          </div>
        )}

        {/* Grading buttons — only show if the candidate actually answered */}
        {!notAttempted && (
          <div className="flex items-center gap-2 pt-1 border-t">
            <span className="text-xs text-muted-foreground mr-1">Mark as:</span>
            <Button
              size="sm"
              variant={localCorrect === true ? 'default' : 'outline'}
              className={cn(
                'h-7 gap-1.5 text-xs',
                localCorrect === true
                  ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                  : 'border-green-400 text-green-700 hover:bg-green-50'
              )}
              onClick={() => handleGrade(true)}
              disabled={grading}
            >
              {grading && localCorrect !== true ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Correct
            </Button>
            <Button
              size="sm"
              variant={localCorrect === false ? 'default' : 'outline'}
              className={cn(
                'h-7 gap-1.5 text-xs',
                localCorrect === false
                  ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                  : 'border-red-400 text-red-700 hover:bg-red-50'
              )}
              onClick={() => handleGrade(false)}
              disabled={grading}
            >
              {grading && localCorrect !== false ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              Incorrect
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CodingCard({ num, sub }) {
  const q = sub.question;
  const a = sub.answer;
  const codeData = typeof a.code_submission === 'object' && a.code_submission
    ? a.code_submission
    : null;
  const language  = codeData?.language ?? null;
  const code      = codeData?.source_code ?? null;
  const stdout    = codeData?.stdout ?? null;
  const testCases = Array.isArray(q.test_cases) ? q.test_cases : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Q{num}</span>
            <Badge variant="outline" className="text-xs capitalize">{q.section}</Badge>
            <DifficultyBadge difficulty={q.difficulty} />
            {language && (
              <Badge variant="secondary" className="text-xs capitalize">{language}</Badge>
            )}
          </div>
          <span className={cn(
            'shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
            a.score != null ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'
          )}>
            {a.score != null ? `${a.score} pts` : 'No submission'}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed">{q.question_text}</p>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Code */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Submitted Code</p>
          {code ? (
            <div className="overflow-hidden rounded-md border" style={{ height: 300 }}>
              <Editor
                height={300}
                language={MONACO_LANG[language] ?? 'plaintext'}
                value={code}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  padding: { top: 8 },
                }}
                theme="vs-dark"
              />
            </div>
          ) : (
            <div className="rounded-md border bg-muted/40 px-3 py-4 text-center text-sm text-muted-foreground italic">
              No code submitted
            </div>
          )}
        </div>

        {/* Test cases table */}
        {testCases.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Test Cases</p>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium w-8">#</th>
                    <th className="px-3 py-2 text-left font-medium">Input</th>
                    <th className="px-3 py-2 text-left font-medium">Expected Output</th>
                    <th className="px-3 py-2 text-left font-medium">Actual Output</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {testCases.map((tc, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2">
                        <pre className="font-mono whitespace-pre-wrap">{tc.input ?? '—'}</pre>
                      </td>
                      <td className="px-3 py-2">
                        <pre className="font-mono whitespace-pre-wrap">{tc.expected_output ?? '—'}</pre>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {/* Per-case output not stored; show combined stdout for first case only */}
                        {i === 0 && stdout
                          ? <pre className="font-mono whitespace-pre-wrap">{stdout}</pre>
                          : <span className="italic">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function CandidateReviewPage() {
  const { examId, candidateExamId } = useParams();
  const navigate = useNavigate();

  const [review, setReview]                   = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);
  const [malpracticeOpen, setMalpracticeOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCandidateReview(candidateExamId);
        if (!cancelled) setReview(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ?? err?.message ?? 'Failed to load review.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [candidateExamId]);

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Review not available.</p>
        {error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }

  const { candidate, exam, candidateExam, submissions, summary } = review;

  // Group submissions by section
  const bySection = {};
  for (const sub of submissions) {
    const s = sub.question.section;
    if (!bySection[s]) bySection[s] = [];
    bySection[s].push(sub);
  }

  const orderedSections = SECTION_ORDER.filter((s) => bySection[s]?.length > 0);

  const handleGradeWritten = useCallback(async (questionId, isCorrect) => {
    const result = await gradeWrittenAnswer(candidateExamId, questionId, isCorrect);
    setReview((prev) => ({
      ...prev,
      summary: { ...prev.summary, final_score: result.new_score },
    }));
  }, [candidateExamId]);

  // Global question number counter
  let qCounter = 0;

  return (
    <>
      <div className="flex flex-col min-h-screen bg-background">
        {/* ── Top header ───────────────────────────────────────────────────── */}
        <div className="border-b bg-background px-6 py-4 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-3 text-muted-foreground"
            onClick={() => navigate(`/admin/exams/${examId}/results`)}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Results
          </Button>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold">{candidate.name}</h1>
                <span className="text-sm text-muted-foreground">{candidate.email}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{exam.title}</span>
                {candidate.stream && <span>· {candidate.stream}</span>}
                {candidate.batch && <span>· Batch {candidate.batch}</span>}
                <span>· Time taken: {fmtDuration(candidateExam.started_at, candidateExam.submitted_at)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {summary.final_score != null && (
                <span className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-semibold',
                  summary.final_score >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                )}>
                  Score: {summary.final_score}%
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMalpracticeOpen(true)}
              >
                <AlertTriangle className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
                Malpractice Alerts
              </Button>
            </div>
          </div>
        </div>

        {/* ── Section tabs ─────────────────────────────────────────────────── */}
        <div className="flex-1 px-6 py-4 pb-20">
          <Tabs defaultValue={orderedSections[0]}>
            <TabsList className="mb-4">
              {orderedSections.map((s) => (
                <TabsTrigger key={s} value={s}>
                  {SECTION_LABEL[s] ?? s}
                  <Badge variant="secondary" className="ml-1.5 text-xs">
                    {bySection[s].length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {orderedSections.map((section) => (
              <TabsContent key={section} value={section} className="mt-0 space-y-4">
                {bySection[section].map((sub) => {
                  qCounter++;
                  const num = qCounter;
                  if (sub.question.type === 'mcq') {
                    return <McqCard key={sub.question.id} num={num} sub={sub} />;
                  }
                  if (sub.question.type === 'coding') {
                    return <CodingCard key={sub.question.id} num={num} sub={sub} />;
                  }
                  return <WrittenCard key={sub.question.id} num={num} sub={sub} onGrade={handleGradeWritten} />;
                })}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* ── Sticky summary bar ───────────────────────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur px-6 py-3">
          <div className="flex flex-wrap items-center gap-5 text-sm">
            {summary.mcq_total > 0 && (
              <span>
                <span className="font-medium">MCQ:</span>{' '}
                <span className={summary.mcq_correct > 0 ? 'text-green-600' : 'text-muted-foreground'}>
                  {summary.mcq_correct}/{summary.mcq_total} correct
                </span>
              </span>
            )}
            {orderedSections.includes('verbal') || orderedSections.includes('technical') ? (
              <span>
                <span className="font-medium">Written:</span>{' '}
                <span className="text-muted-foreground">
                  {submissions.filter(s => s.question.type === 'written' && s.answer.answer_text?.trim()).length} answered
                </span>
              </span>
            ) : null}
            {summary.coding_score > 0 && (
              <span>
                <span className="font-medium">Coding:</span>{' '}
                <span className="text-blue-600">{summary.coding_score} pts</span>
              </span>
            )}
            <span className="ml-auto font-semibold">
              Total Score:{' '}
              <span className={summary.final_score >= 60 ? 'text-green-600' : 'text-foreground'}>
                {summary.final_score != null ? `${summary.final_score}%` : '—'}
              </span>
            </span>
          </div>
        </div>
      </div>

      <MalpracticeDrawer
        open={malpracticeOpen}
        onOpenChange={setMalpracticeOpen}
        candidateExamId={candidateExamId}
        candidateName={candidate.name}
      />
    </>
  );
}
