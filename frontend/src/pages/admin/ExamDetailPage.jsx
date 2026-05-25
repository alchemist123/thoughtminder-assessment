import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Rocket, Copy, BarChart2, Check, Eye, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { LaunchExamDialog } from '@/components/admin/LaunchExamDialog';
import { MalpracticeDrawer } from '@/components/admin/MalpracticeDrawer';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/hooks/use-toast';
import { getResults } from '@/services/examService';
import useExamStore from '@/store/examStore';
import { cn } from '@/lib/utils';

const SECTION_ORDER = ['quantitative', 'verbal', 'technical', 'coding'];
const SECTION_LABEL = {
  quantitative: 'Quantitative Aptitude',
  verbal: 'Verbal',
  technical: 'Technical',
  coding: 'Coding',
};

function StatusBadge({ status }) {
  const styles = {
    draft: 'bg-muted text-muted-foreground',
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        styles[status] ?? 'bg-muted text-muted-foreground'
      )}
    >
      {status}
    </span>
  );
}

function CandidateStatusBadge({ status }) {
  const styles = {
    pending: 'bg-muted text-muted-foreground',
    in_progress: 'bg-yellow-100 text-yellow-800',
    submitted: 'bg-green-100 text-green-800',
  };
  const labels = { pending: 'Pending', in_progress: 'In Progress', submitted: 'Submitted' };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        styles[status] ?? 'bg-muted text-muted-foreground'
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

function CopyButton({ text }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
      aria-label="Copy"
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export function ExamDetailPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const { currentExam, loading, fetchExam, launchResult, clearLaunchResult } = useExamStore();

  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  const [launchDialogOpen, setLaunchDialogOpen] = useState(false);
  const [malpracticeDrawer, setMalpracticeDrawer] = useState({ open: false, candidateExamId: null, candidateName: '' });

  // Pre-selected candidate IDs passed from CandidatesPage
  const preSelectedCandidateIds = location.state?.preSelectedCandidateIds ?? [];

  useEffect(() => {
    fetchExam(examId);
    clearLaunchResult();
  }, [examId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-open launch dialog if navigated here with pre-selected candidates
  useEffect(() => {
    if (
      currentExam &&
      currentExam.status === 'draft' &&
      preSelectedCandidateIds.length > 0
    ) {
      setLaunchDialogOpen(true);
    }
  }, [currentExam?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch candidates when exam is active/completed
  const fetchCandidates = async () => {
    setCandidatesLoading(true);
    try {
      const data = await getResults(examId);
      setCandidates(data?.results ?? []);
    } catch {
      // silently ignore
    } finally {
      setCandidatesLoading(false);
    }
  };

  useEffect(() => {
    if (currentExam && currentExam.status !== 'draft') {
      fetchCandidates();
    }
  }, [currentExam?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // When launch succeeds: refresh exam + candidates, then clear result
  useEffect(() => {
    if (launchResult) {
      fetchExam(examId);
      fetchCandidates();
      toast({
        title: 'Exam launched',
        description: `${launchResult.length} candidate${launchResult.length !== 1 ? 's' : ''} assigned. Share the exam URL with them.`,
      });
      clearLaunchResult();
    }
  }, [launchResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const examUrl = `${window.location.origin}/exam/${examId}`;

  const exportCandidatesCSV = () => {
    const header = 'Name,Email,Status,Score';
    const rows = candidates.map(
      (r) =>
        `"${r.candidate?.name ?? ''}","${r.candidate?.email ?? ''}","${r.status}","${r.score ?? ''}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `candidates-${examId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'CSV downloaded' });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading && !currentExam) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!currentExam) {
    return (
      <div className="py-16 text-center text-muted-foreground">Exam not found.</div>
    );
  }

  const questionsBySection = currentExam.questionsBySection ?? {};
  const isDraft = currentExam.status === 'draft';
  const totalQuestions = Object.values(questionsBySection).reduce(
    (sum, qs) => sum + qs.length,
    0
  );

  return (
    <div>
      <PageHeader
        title={currentExam.title}
        description={
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={currentExam.status} />
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {currentExam.duration_minutes} min
            </span>
            <span className="text-xs text-muted-foreground">
              {totalQuestions} question{totalQuestions !== 1 ? 's' : ''}
            </span>
          </div>
        }
      >
        <div className="flex items-center gap-2">
          {currentExam.status !== 'draft' && (
            <Button
              variant="outline"
              onClick={() => navigate(`/admin/exams/${examId}/results`)}
            >
              <BarChart2 className="mr-2 h-4 w-4" />
              Results
            </Button>
          )}
          {isDraft && (
            <Button onClick={() => setLaunchDialogOpen(true)}>
              <Rocket className="mr-2 h-4 w-4" />
              Launch Exam
            </Button>
          )}
        </div>
      </PageHeader>

      <Tabs defaultValue="questions">
        <TabsList className="mb-4">
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="candidates" disabled={isDraft}>
            Candidates
            {candidates.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {candidates.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Questions tab ──────────────────────────────────────────── */}
        <TabsContent value="questions" className="mt-0">
          <div className="space-y-6">
            {SECTION_ORDER.filter((s) => questionsBySection[s]?.length > 0).map((section) => {
              const qs = questionsBySection[section];
              return (
                <div key={section}>
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{SECTION_LABEL[section]}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {qs.length}
                    </Badge>
                  </div>
                  <div className="rounded-md border divide-y">
                    {qs.map((q, i) => (
                      <div key={q.id} className="flex items-start gap-3 px-4 py-3">
                        <span className="shrink-0 text-sm text-muted-foreground w-6">
                          {i + 1}.
                        </span>
                        <span className="flex-1 text-sm leading-snug">{q.question_text}</span>
                        <span className="shrink-0 text-xs text-muted-foreground capitalize">
                          {q.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {totalQuestions === 0 && (
              <EmptyState
                title="No questions added"
                description="This exam has no questions yet. Edit the exam to add questions."
              />
            )}
          </div>
        </TabsContent>

        {/* ── Candidates tab ─────────────────────────────────────────── */}
        <TabsContent value="candidates" className="mt-0">
          {/* Exam access URL — shared by all candidates */}
          {currentExam?.status !== 'draft' && (
            <div className="mb-4 flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
              <span className="text-xs text-muted-foreground shrink-0">Exam URL:</span>
              <span className="flex-1 truncate text-xs font-mono">{examUrl}</span>
              <CopyButton text={examUrl} />
            </div>
          )}

          {candidates.length > 0 && (
            <div className="mb-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={exportCandidatesCSV}>
                Export CSV
              </Button>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-20 text-right">Score</TableHead>
                  <TableHead className="w-24">Malpractice</TableHead>
                  <TableHead className="w-36">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidatesLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : candidates.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <EmptyState
                          title="No candidates assigned"
                          description="Launch this exam to assign candidates."
                        />
                      </TableCell>
                    </TableRow>
                  )
                  : candidates.map((r) => {
                      const mCount = r.malpractice_count != null ? Number(r.malpractice_count) : 0;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            {r.candidate?.name ?? '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {r.candidate?.email ?? '—'}
                          </TableCell>
                          <TableCell>
                            <CandidateStatusBadge status={r.status} />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {r.score != null ? `${r.score}%` : '—'}
                          </TableCell>
                          <TableCell>
                            {mCount > 0 ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors"
                                onClick={() =>
                                  setMalpracticeDrawer({
                                    open: true,
                                    candidateExamId: r.id,
                                    candidateName: r.candidate?.name ?? '',
                                  })
                                }
                              >
                                <AlertTriangle className="h-3 w-3" />
                                {mCount}
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={r.status !== 'submitted'}
                              onClick={() =>
                                navigate(`/admin/exams/${examId}/review/${r.id}`)
                              }
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              View Answers
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <MalpracticeDrawer
        open={malpracticeDrawer.open}
        onOpenChange={(o) => setMalpracticeDrawer((s) => ({ ...s, open: o }))}
        candidateExamId={malpracticeDrawer.candidateExamId}
        candidateName={malpracticeDrawer.candidateName}
      />

      {/* Launch dialog */}
      <LaunchExamDialog
        open={launchDialogOpen}
        onOpenChange={setLaunchDialogOpen}
        examId={examId}
        examTitle={currentExam.title}
        preSelectedIds={preSelectedCandidateIds}
      />

    </div>
  );
}
