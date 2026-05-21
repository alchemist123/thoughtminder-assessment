import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function ExamsPage() {
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader title="Exams" description="Create and manage exams.">
        <Button onClick={() => navigate('/admin/exams/new')}>New exam</Button>
      </PageHeader>
      <p className="text-muted-foreground">Exam list — coming soon.</p>
    </div>
  );
}
