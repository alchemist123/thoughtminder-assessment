import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Play, RotateCcw, CheckCircle2, Clock } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/axios';

const SECTION_LABELS = {
  quantitative: 'Quant',
  verbal: 'Verbal',
  technical: 'Technical',
  coding: 'Coding',
};

function ExamCard({ record, onEnter }) {
  const { exam, status, score, access_link, started_at } = record;
  const isPending = status === 'pending';
  const isStarted = status === 'started';
  const isSubmitted = status === 'submitted';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{exam?.title}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(exam?.sections ?? []).map((s) => (
                <Badge key={s} variant="secondary" className="text-xs capitalize">
                  {SECTION_LABELS[s] ?? s}
                </Badge>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {exam?.duration_minutes} min
              </span>
              {isSubmitted && score != null && (
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  Score: {score}
                </span>
              )}
              {isStarted && started_at && (
                <span className="text-amber-500 font-medium">In Progress</span>
              )}
            </div>
          </div>

          {(isPending || isStarted) && (
            <Button
              size="sm"
              variant={isStarted ? 'outline' : 'default'}
              className="shrink-0"
              onClick={() => onEnter(record)}
            >
              {isStarted ? (
                <>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Resume
                </>
              ) : (
                <>
                  <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
                  Enter Exam
                </>
              )}
            </Button>
          )}
          {isSubmitted && (
            <Badge variant="outline" className="shrink-0 border-green-500/40 text-green-500">
              Submitted
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SectionGroup({ title, icon: Icon, records, onEnter, emptyTitle, emptyDesc }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
        <Icon className="h-4 w-4" />
        {title}
        <span className="font-normal normal-case tracking-normal text-muted-foreground/60">
          ({records.length})
        </span>
      </h2>
      {records.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDesc}
          className="border rounded-lg py-8"
        />
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <ExamCard key={r.id} record={r} onEnter={onEnter} />
          ))}
        </div>
      )}
    </section>
  );
}

export function CandidateDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/exam/my-exams')
      .then(({ data }) => setRecords(data.data ?? []))
      .catch(() => setError('Failed to load exams. Please refresh.'))
      .finally(() => setLoading(false));
  }, []);

  const handleEnter = (record) => {
    const examId = record.exam?.id;
    if (!examId) return;
    if (record.status === 'started') {
      navigate(`/exam/${examId}/take`);
    } else {
      navigate(`/exam/${examId}`);
    }
  };

  const pending = records.filter((r) => r.status === 'pending');
  const inProgress = records.filter((r) => r.status === 'started');
  const completed = records.filter((r) => r.status === 'submitted');

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${user?.name ?? 'Candidate'}`}
        description="Your ThoughtMinder Assessment portal. All assigned exams appear below."
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {inProgress.length > 0 && (
            <SectionGroup
              title="In Progress"
              icon={RotateCcw}
              records={inProgress}
              onEnter={handleEnter}
              emptyTitle=""
              emptyDesc=""
            />
          )}

          <SectionGroup
            title="Pending Exams"
            icon={ClipboardList}
            records={pending}
            onEnter={handleEnter}
            emptyTitle="No pending exams"
            emptyDesc="You have no exams waiting. Check back when your institution assigns one."
          />

          <SectionGroup
            title="Completed Exams"
            icon={CheckCircle2}
            records={completed}
            onEnter={handleEnter}
            emptyTitle="No completed exams"
            emptyDesc="Exams you have submitted will appear here."
          />
        </div>
      )}
    </div>
  );
}
