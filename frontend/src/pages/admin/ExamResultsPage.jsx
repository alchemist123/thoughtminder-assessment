import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUp, ArrowDown, Download, Eye, AlertTriangle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getResults } from '@/services/examService';
import { EmptyState } from '@/components/EmptyState';
import { MalpracticeDrawer } from '@/components/admin/MalpracticeDrawer';
import { cn } from '@/lib/utils';

const PASS_THRESHOLD = 60;

function StatusBadge({ status }) {
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

function StatCard({ title, value, sub, loading }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <p className="text-3xl font-bold">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function ExamResultsPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [exam, setExam] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortDir, setSortDir] = useState('desc');
  const [malpracticeDrawer, setMalpracticeDrawer] = useState({ open: false, candidateExamId: null, candidateName: '' });

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await getResults(examId);
        if (!cancelled) {
          setExam(data.exam ?? null);
          setResults(data.results ?? []);
        }
      } catch {
        if (!cancelled) {
          toast({
            title: 'Error',
            description: 'Failed to load results.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [examId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stats ──────────────────────────────────────────────────────────────────
  const submitted = results.filter((r) => r.status === 'submitted');
  const avgScore =
    submitted.length > 0
      ? Math.round(submitted.reduce((s, r) => s + (r.score ?? 0), 0) / submitted.length)
      : null;
  const passCount = submitted.filter((r) => (r.score ?? 0) >= PASS_THRESHOLD).length;
  const passRate =
    submitted.length > 0 ? Math.round((passCount / submitted.length) * 100) : null;

  // ── Sort ───────────────────────────────────────────────────────────────────
  const sorted = [...results].sort((a, b) => {
    const aScore = a.score ?? -1;
    const bScore = b.score ?? -1;
    return sortDir === 'desc' ? bScore - aScore : aScore - bScore;
  });

  const toggleSort = () => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    const headers = [
      'Rank',
      'Name',
      'Email',
      'Stream',
      'Batch',
      'Score (%)',
      'Status',
      'Started At',
      'Submitted At',
      'Time Taken (min)',
    ];
    const rows = sorted.map((r, i) => [
      i + 1,
      r.candidate?.name ?? '',
      r.candidate?.email ?? '',
      r.candidate?.stream ?? '',
      r.candidate?.batch ?? '',
      r.score ?? '',
      r.status,
      r.started_at ? new Date(r.started_at).toISOString() : '',
      r.submitted_at ? new Date(r.submitted_at).toISOString() : '',
      r.time_taken_minutes ?? '',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results-${examId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-3 text-muted-foreground"
          onClick={() => navigate(`/admin/exams/${examId}`)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Exam
        </Button>

        <div className="flex items-start justify-between">
          <div>
            {loading ? (
              <Skeleton className="h-8 w-64" />
            ) : (
              <h1 className="text-2xl font-bold tracking-tight">
                {exam?.title ?? 'Results'}
              </h1>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              {loading ? '' : `${results.length} candidate${results.length !== 1 ? 's' : ''} · ${submitted.length} submitted`}
            </p>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={loading || results.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Submitted"
          value={loading ? '—' : submitted.length}
          sub={loading ? '' : `of ${results.length} total`}
          loading={loading}
        />
        <StatCard
          title="Average Score"
          value={loading ? '—' : avgScore != null ? `${avgScore}%` : '—'}
          sub="submitted only"
          loading={loading}
        />
        <StatCard
          title="Pass Rate"
          value={loading ? '—' : passRate != null ? `${passRate}%` : '—'}
          sub={`≥ ${PASS_THRESHOLD}% threshold`}
          loading={loading}
        />
      </div>

      <MalpracticeDrawer
        open={malpracticeDrawer.open}
        onOpenChange={(o) => setMalpracticeDrawer((s) => ({ ...s, open: o }))}
        candidateExamId={malpracticeDrawer.candidateExamId}
        candidateName={malpracticeDrawer.candidateName}
      />

      {/* Results table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14 text-center">Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Stream</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead
                className="w-28 cursor-pointer select-none"
                onClick={toggleSort}
              >
                <span className="flex items-center gap-1">
                  Score (%)
                  {sortDir === 'desc' ? (
                    <ArrowDown className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ArrowUp className="h-3 w-3 text-muted-foreground" />
                  )}
                </span>
              </TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-36">Started At</TableHead>
              <TableHead className="w-36">Submitted At</TableHead>
              <TableHead className="w-28">Time Taken</TableHead>
              <TableHead className="w-24">Malpractice</TableHead>
              <TableHead className="w-40">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 11 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : sorted.length === 0
              ? (
                <TableRow>
                  <TableCell colSpan={11} className="p-0">
                    <EmptyState
                      title="No results yet"
                      description="Results will appear here once candidates start or submit their exams."
                    />
                  </TableCell>
                </TableRow>
              )
              : sorted.map((r, index) => {
                  const isPassed =
                    r.status === 'submitted' && (r.score ?? 0) >= PASS_THRESHOLD;
                  const mCount = r.malpractice_count != null ? Number(r.malpractice_count) : 0;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-center font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.candidate?.name ?? '—'}
                      </TableCell>
                      <TableCell>{r.candidate?.stream ?? '—'}</TableCell>
                      <TableCell>{r.candidate?.batch ?? '—'}</TableCell>
                      <TableCell>
                        {r.score != null ? (
                          <span
                            className={cn(
                              'font-semibold',
                              isPassed ? 'text-green-600' : 'text-red-600'
                            )}
                          >
                            {r.score}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtDate(r.started_at)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtDate(r.submitted_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.time_taken_minutes != null
                          ? `${r.time_taken_minutes} min`
                          : '—'}
                      </TableCell>
                      {/* Malpractice column */}
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
                            {mCount} alert{mCount !== 1 ? 's' : ''}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Clean</span>
                        )}
                      </TableCell>
                      {/* Actions column */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {r.status === 'submitted' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() =>
                                navigate(`/admin/exams/${examId}/review/${r.id}`)
                              }
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              Answers
                            </Button>
                          )}
                          {mCount > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700"
                              onClick={() =>
                                setMalpracticeDrawer({
                                  open: true,
                                  candidateExamId: r.id,
                                  candidateName: r.candidate?.name ?? '',
                                })
                              }
                            >
                              <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                              Alerts
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
