import { PageHeader } from '@/components/ui/PageHeader';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function ExamDetailPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader title="Exam detail" description={`Exam ID: ${examId}`}>
        <Button variant="outline" onClick={() => navigate(`/admin/exams/${examId}/results`)}>
          View results
        </Button>
      </PageHeader>
      <p className="text-muted-foreground">Exam management — coming soon.</p>
    </div>
  );
}
