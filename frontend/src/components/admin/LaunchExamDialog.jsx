import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Rocket } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { getCandidates } from '@/services/adminService';
import useExamStore from '@/store/examStore';

const LIMIT = 20;

export function LaunchExamDialog({ open, onOpenChange, examId, examTitle, preSelectedIds = [] }) {
  const { toast } = useToast();
  const { launchExam } = useExamStore();

  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stream, setStream] = useState('');
  const [batch, setBatch] = useState('');
  const [fetchLoading, setFetchLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selected, setSelected] = useState(new Set(preSelectedIds));

  const debouncedSearch = useDebounce(search, 300);
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // Unique stream / batch values from loaded page
  const uniqueStreams = [...new Set(candidates.map((c) => c.stream).filter(Boolean))].sort();
  const uniqueBatches = [...new Set(candidates.map((c) => c.batch).filter(Boolean))].sort();

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(preSelectedIds));
    setSearch('');
    setStream('');
    setBatch('');
    setPage(1);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const fetch = async () => {
      setFetchLoading(true);
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
        if (!cancelled) setCandidates([]);
      } finally {
        if (!cancelled) setFetchLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [open, debouncedSearch, stream, batch, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

  const allOnPage =
    candidates.length > 0 && candidates.every((c) => selected.has(c.id));
  const someSelected = !allOnPage && candidates.some((c) => selected.has(c.id));

  const headerCheckRef = useRef(null);
  useEffect(() => {
    if (headerCheckRef.current) {
      headerCheckRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPage) {
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

  const clearFilters = () => {
    setSearch('');
    setStream('');
    setBatch('');
    setPage(1);
  };

  const hasFilters = search || stream || batch;

  const handleLaunch = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      await launchExam(examId, [...selected]);
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Launch failed',
        description: err?.response?.data?.message ?? 'Failed to launch exam.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-base">
            Select Candidates for{' '}
            <span className="font-semibold">{examTitle}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Filter bar */}
        <div className="px-6 py-3 border-b flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search name or email…"
              value={search}
              onChange={handleSearchChange}
              className="pl-9"
            />
          </div>

          <Select value={stream || 'all'} onValueChange={handleStreamChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All streams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All streams</SelectItem>
              {uniqueStreams.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
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
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Selected count */}
        <div className="px-6 py-2 border-b flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {total} candidate{total !== 1 ? 's' : ''} found
          </span>
          <span className="text-sm font-medium">
            {selected.size} selected
          </span>
        </div>

        {/* Candidate list */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 sticky top-0">
              <tr>
                <th className="px-4 py-2.5 w-10">
                  <input
                    ref={headerCheckRef}
                    type="checkbox"
                    checked={allOnPage}
                    onChange={toggleAll}
                    className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                    aria-label="Select all on page"
                  />
                </th>
                <th className="px-4 py-2.5 text-left font-medium">Name</th>
                <th className="px-4 py-2.5 text-left font-medium">Email</th>
                <th className="px-4 py-2.5 text-left font-medium">Stream</th>
                <th className="px-4 py-2.5 text-left font-medium">Batch</th>
              </tr>
            </thead>
            <tbody>
              {fetchLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-2.5">
                        <Skeleton className="h-4 w-4" />
                      </td>
                      {Array.from({ length: 4 }).map((_, j) => (
                        <td key={j} className="px-4 py-2.5">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : candidates.length === 0
                ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No candidates found.
                    </td>
                  </tr>
                )
                : candidates.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleOne(c.id)}
                    >
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(c.id)}
                          onCheckedChange={() => toggleOne(c.id)}
                        />
                      </td>
                      <td className="px-4 py-2.5 font-medium">{c.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{c.email}</td>
                      <td className="px-4 py-2.5">{c.stream ?? '—'}</td>
                      <td className="px-4 py-2.5">{c.batch ?? '—'}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-2 border-t flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {total === 0
              ? 'No candidates'
              : `Showing ${(page - 1) * LIMIT + 1}–${Math.min(page * LIMIT, total)} of ${total}`}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1 || fetchLoading}
              onClick={() => setPage(1)}
              className="px-2"
            >
              «
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1 || fetchLoading}
              onClick={() => setPage((p) => p - 1)}
              className="px-2"
            >
              ‹
            </Button>
            {pageNumbers.map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground select-none">…</span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="sm"
                  disabled={fetchLoading}
                  onClick={() => setPage(p)}
                  className="px-2.5 min-w-[32px]"
                >
                  {p}
                </Button>
              )
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages || fetchLoading}
              onClick={() => setPage((p) => p + 1)}
              className="px-2"
            >
              ›
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages || fetchLoading}
              onClick={() => setPage(totalPages)}
              className="px-2"
            >
              »
            </Button>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleLaunch} disabled={selected.size === 0 || submitting}>
            <Rocket className="mr-2 h-4 w-4" />
            {submitting
              ? 'Launching…'
              : `Launch Exam (${selected.size} candidate${selected.size !== 1 ? 's' : ''})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
