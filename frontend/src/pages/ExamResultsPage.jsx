import { PageHeader } from '@/components/ui/PageHeader';
import { useParams } from 'react-router-dom';

export function ExamResultsPage() {
  const { examId } = useParams();
  return (
    <div>
      <PageHeader title="Exam results" description={`Results for exam ${examId}`} />
      <p className="text-muted-foreground">Results table — coming soon.</p>
    </div>
  );
}
