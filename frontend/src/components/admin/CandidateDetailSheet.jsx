import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getCandidate, deleteCandidate } from '@/services/adminService';

const STATUS_VARIANT = {
  pending: 'secondary',
  started: 'default',
  submitted: 'outline',
};

function InfoGrid({ items }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map(({ label, value }) => (
        <div key={label}>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium">{value ?? '—'}</p>
        </div>
      ))}
    </div>
  );
}

export function CandidateDetailSheet({ candidateId, open, onOpenChange, onDeleted }) {
  const { toast } = useToast();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open || !candidateId) return;
    setLoading(true);
    setCandidate(null);
    getCandidate(candidateId)
      .then(setCandidate)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, candidateId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteCandidate(candidateId);
      toast({ title: 'Candidate deleted' });
      onOpenChange(false);
      onDeleted?.();
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const initials = candidate?.name
    ?.split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('') ?? '?';

  const examHistory = candidate?.candidateExams ?? [];

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] max-w-full overflow-y-auto">
        <SheetHeader className="pb-4">
          {loading ? (
            <>
              <SheetTitle className="sr-only">Candidate Details</SheetTitle>
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </>
          ) : candidate ? (
            <>
              <SheetTitle className="sr-only">{candidate.name}</SheetTitle>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{candidate.name}</p>
                  <p className="text-sm text-muted-foreground">{candidate.email}</p>
                </div>
              </div>
            </>
          ) : (
            <SheetTitle className="sr-only">Candidate Details</SheetTitle>
          )}
        </SheetHeader>

        {!loading && candidate && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete Candidate
              </Button>
            </div>
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Academic Info
              </h3>
              <InfoGrid
                items={[
                  { label: 'Stream', value: candidate.stream },
                  { label: 'Batch', value: candidate.batch },
                  { label: 'SGPA', value: candidate.sgpa },
                ]}
              />
            </section>

            <Separator />

            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Interests
              </h3>
              <p className="text-sm">{candidate.interested_area || '—'}</p>
            </section>

            <Separator />

            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Exam History
              </h3>
              {examHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No exams taken.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="pb-2 text-left font-medium">Exam</th>
                        <th className="pb-2 text-left font-medium">Status</th>
                        <th className="pb-2 text-right font-medium">Score</th>
                        <th className="pb-2 text-right font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examHistory.map((ce) => (
                        <tr key={ce.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">
                            {ce.exam?.title ?? '—'}
                          </td>
                          <td className="py-2 pr-4">
                            <Badge variant={STATUS_VARIANT[ce.status] ?? 'secondary'}>
                              {ce.status}
                            </Badge>
                          </td>
                          <td className="py-2 text-right">
                            {ce.score != null ? Number(ce.score).toFixed(1) : '—'}
                          </td>
                          <td className="py-2 text-right text-muted-foreground">
                            {(ce.submitted_at ?? ce.started_at)
                              ? new Date(ce.submitted_at ?? ce.started_at).toLocaleDateString()
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>

    <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete candidate?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{candidate?.name}</strong> ({candidate?.email}) will be soft-deleted and removed from all views. This action can be reversed from the database.
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
    </>
  );
}
