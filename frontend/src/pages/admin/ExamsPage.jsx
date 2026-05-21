import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Rocket, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteExam } from '@/services/adminService';
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
import { EmptyState } from '@/components/EmptyState';
import useExamStore from '@/store/examStore';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

const SECTION_SHORT = {
  quantitative: 'Quant',
  verbal: 'Verbal',
  technical: 'Tech',
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
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status] ?? 'bg-muted text-muted-foreground'}`}
    >
      {status}
    </span>
  );
}

export function ExamsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { exams, loading, fetchExams } = useExamStore();
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, title }
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteExam(deleteTarget.id);
      toast({ title: 'Exam deleted' });
      fetchExams();
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (value) => {
    fetchExams(value !== 'all' ? { status: value } : {});
  };

  const skeletonRows = Array.from({ length: 5 }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: 7 }).map((_, j) => (
        <TableCell key={j}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ));

  return (
    <div>
      <PageHeader title="Exams" description={loading ? '' : `${exams.length} exam${exams.length !== 1 ? 's' : ''}`}>
        <Button onClick={() => navigate('/admin/exams/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Exam
        </Button>
      </PageHeader>

      <Tabs defaultValue="all" onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-48">Sections</TableHead>
                    <TableHead className="w-28">Duration</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-28 text-center">Candidates</TableHead>
                    <TableHead className="w-36">Created At</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    skeletonRows
                  ) : exams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <EmptyState
                          title="No exams found"
                          description="Create your first exam to get started."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    exams.map((exam) => (
                      <TableRow
                        key={exam.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/admin/exams/${exam.id}`)}
                      >
                        <TableCell className="font-medium">{exam.title}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(exam.sections)
                              ? exam.sections.map((s) => (
                                  <Badge key={s} variant="secondary" className="text-xs">
                                    {SECTION_SHORT[s] ?? s}
                                  </Badge>
                                ))
                              : '—'}
                          </div>
                        </TableCell>
                        <TableCell>{exam.duration_minutes} min</TableCell>
                        <TableCell>
                          <StatusBadge status={exam.status} />
                        </TableCell>
                        <TableCell className="text-center">
                          {exam.candidate_count ?? 0}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {exam.created_at
                            ? new Date(exam.created_at).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/exams/${exam.id}`)}
                            >
                              View
                            </Button>
                            {exam.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => navigate(`/admin/exams/${exam.id}`)}
                              >
                                <Rocket className="mr-1 h-3 w-3" />
                                Launch
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget({ id: exam.id, title: exam.title })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete exam?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.title}</strong> will be soft-deleted and hidden from all views. This action can be reversed from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
