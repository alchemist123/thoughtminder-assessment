import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ClipboardList, FileQuestion, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { GenerateLinkDialog } from '@/components/admin/GenerateLinkDialog';
import { getCandidates, getExams, getQuestions } from '@/services/adminService';

function StatCard({ title, value, icon: Icon, loading }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-3xl font-bold">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    candidates: 0,
    activeExams: 0,
    completedExams: 0,
    questions: 0,
  });
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [candidatesData, examsData, questionsData] = await Promise.all([
          getCandidates({ page: 1, limit: 5 }),
          getExams(),
          getQuestions({ page: 1, limit: 1 }),
        ]);

        const examList = Array.isArray(examsData)
          ? examsData
          : (examsData?.exams ?? []);

        setStats({
          candidates: candidatesData?.pagination?.total ?? 0,
          activeExams: examList.filter((e) => e.status === 'active').length,
          completedExams: examList.filter((e) => e.status === 'completed').length,
          questions: questionsData?.pagination?.total ?? 0,
        });
        setRecent(candidatesData?.candidates ?? []);
      } catch {
        // show zeros on error
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      <PageHeader title="Dashboard" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Candidates"
          value={stats.candidates}
          icon={Users}
          loading={loading}
        />
        <StatCard
          title="Active Exams"
          value={stats.activeExams}
          icon={ClipboardList}
          loading={loading}
        />
        <StatCard
          title="Total Questions"
          value={stats.questions}
          icon={FileQuestion}
          loading={loading}
        />
        <StatCard
          title="Completed Exams"
          value={stats.completedExams}
          icon={CheckCircle2}
          loading={loading}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <GenerateLinkDialog />
            <Button variant="outline" onClick={() => navigate('/admin/questions')}>
              Add question
            </Button>
            <Button variant="outline" onClick={() => navigate('/admin/exams/new')}>
              Create exam
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent registrations</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No candidates registered yet.</p>
            ) : (
              <ul className="divide-y">
                {recent.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.stream} · Batch {c.batch}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {c.created_at
                        ? new Date(c.created_at).toLocaleDateString()
                        : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
