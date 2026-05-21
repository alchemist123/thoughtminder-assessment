import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Search, Trash2, X } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { GenerateLinkDialog } from '@/components/admin/GenerateLinkDialog';
import { CandidateDetailSheet } from '@/components/admin/CandidateDetailSheet';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { getCandidates, deleteCandidate } from '@/services/adminService';

const LIMIT = 20;

export function CandidatesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stream, setStream] = useState('');
  const [batch, setBatch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [detailId, setDetailId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name } | { bulk: true, ids: [...] }
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const uniqueStreams = [...new Set(candidates.map((c) => c.stream).filter(Boolean))].sort();
  const uniqueBatches = [...new Set(candidates.map((c) => c.batch).filter(Boolean))].sort();

  useEffect(() => {
    let cancelled = false;
    const fetchCandidates = async () => {
      setLoading(true);
      try {
        const data = await getCandidates({
          search: debouncedSearch || undefined,
          stream: stream || undefined,
          batch: batch || undefined,
          page,
          limit: LIMIT,
        });
        if (!cancelled) {
          setCandidates(data?.candidates ?? []);
          setTotal(data?.pagination?.total ?? 0);
        }
      } catch {
        if (!cancelled) {
          toast({
            title: 'Error',
            description: 'Failed to load candidates.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchCandidates();
    return () => { cancelled = true; };
  }, [debouncedSearch, stream, batch, page, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const allOnPageSelected =
    candidates.length > 0 && candidates.every((c) => selected.has(c.id));
  const someSelected = !allOnPageSelected && candidates.some((c) => selected.has(c.id));

  const headerCheckRef = useRef(null);
  useEffect(() => {
    if (headerCheckRef.current) {
      headerCheckRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        candidates.forEach((c) => next.delete(c.id));
      } else {
        candidates.forEach((c) => next.add(c.id));
      }
      return next;
    });
  };

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openDetail = (candidate) => {
    setDetailId(candidate.id);
    setSheetOpen(true);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStreamChange = (v) => {
    setStream(v === 'all' ? '' : v);
    setPage(1);
  };

  const handleBatchChange = (v) => {
    setBatch(v === 'all' ? '' : v);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch('');
    setStream('');
    setBatch('');
    setPage(1);
  };

  const hasFilters = search || stream || batch;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const ids = deleteTarget.bulk ? deleteTarget.ids : [deleteTarget.id];
      await Promise.all(ids.map((id) => deleteCandidate(id)));
      toast({ title: ids.length > 1 ? `${ids.length} candidates deleted` : 'Candidate deleted' });
      setSelected(new Set());
      setRefreshKey((k) => k + 1);
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className={selected.size > 0 ? 'pb-20' : ''}>
      <PageHeader
        title="Candidates"
        description={loading ? '' : `${total} registered`}
      >
        <GenerateLinkDialog />
      </PageHeader>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search name or email…"
            value={search}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>

        <Select value={stream || 'all'} onValueChange={handleStreamChange}>
          <SelectTrigger className="w-[145px]">
            <SelectValue placeholder="All streams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All streams</SelectItem>
            {uniqueStreams.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={batch || 'all'} onValueChange={handleBatchChange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="All batches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All batches</SelectItem>
            {uniqueBatches.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  ref={headerCheckRef}
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                  aria-label="Select all on page"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Stream</TableHead>
              <TableHead>SGPA</TableHead>
              <TableHead>Interested Area</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Registered At</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : candidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="p-0">
                  <EmptyState
                    title="No candidates found"
                    description="Generate a registration link to invite candidates, or adjust your search filters."
                  />
                </TableCell>
              </TableRow>
            ) : (
              candidates.map((candidate) => (
                <TableRow
                  key={candidate.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openDetail(candidate)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(candidate.id)}
                      onChange={() => toggleOne(candidate.id)}
                      className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                      aria-label={`Select ${candidate.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{candidate.name}</TableCell>
                  <TableCell className="text-muted-foreground">{candidate.email}</TableCell>
                  <TableCell>{candidate.stream ?? '—'}</TableCell>
                  <TableCell>{candidate.sgpa ?? '—'}</TableCell>
                  <TableCell className="max-w-[160px] truncate">
                    {candidate.interested_area ?? '—'}
                  </TableCell>
                  <TableCell>{candidate.batch ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {candidate.created_at
                      ? new Date(candidate.created_at).toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDetail(candidate)}
                        aria-label={`View ${candidate.name}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget({ id: candidate.id, name: candidate.name })}
                        aria-label={`Delete ${candidate.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Sticky selection bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-4 shadow-lg md:left-60">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selected.size} candidate{selected.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelected(new Set())}
              >
                Clear selection
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteTarget({ bulk: true, ids: [...selected] })}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete ({selected.size})
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  navigate('/admin/exams/new', {
                    state: { candidateIds: [...selected] },
                  })
                }
              >
                Launch Exam for Selected ({selected.size})
              </Button>
            </div>
          </div>
        </div>
      )}

      <CandidateDetailSheet
        candidateId={detailId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onDeleted={() => {
          setSelected(new Set());
          setRefreshKey((k) => k + 1);
        }}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.bulk
                ? `Delete ${deleteTarget.ids.length} candidate${deleteTarget.ids.length !== 1 ? 's' : ''}?`
                : 'Delete candidate?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.bulk
                ? `${deleteTarget.ids.length} candidates will be soft-deleted and removed from all views.`
                : <><strong>{deleteTarget?.name}</strong> will be soft-deleted and removed from all views.</>}
              {' '}This action can be reversed from the database.
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
