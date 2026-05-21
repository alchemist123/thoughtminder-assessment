import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { QuestionFormDialog } from '@/components/admin/QuestionFormDialog';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import useQuestionStore from '@/store/questionStore';

const TABS = [
  { value: 'quantitative', label: 'Quantitative Aptitude' },
  { value: 'verbal', label: 'Verbal' },
  { value: 'technical', label: 'Technical' },
  { value: 'coding', label: 'Coding' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'All Difficulties' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'mcq', label: 'MCQ' },
  { value: 'written', label: 'Written' },
];

function truncate(text, maxLen = 80) {
  if (!text) return '—';
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

function DifficultyBadge({ difficulty }) {
  const styles = {
    easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    hard: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  if (!difficulty) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[difficulty] ?? 'bg-muted text-muted-foreground'}`}
    >
      {difficulty}
    </span>
  );
}

export function QuestionsPage() {
  const { toast } = useToast();
  const {
    questions,
    total,
    loading,
    filters,
    setFilter,
    resetFilters,
    fetchQuestions,
    deleteQuestion,
  } = useQuestionStore();

  const [search, setSearch] = useState(filters.search);
  const debouncedSearch = useDebounce(search, 300);

  const [formOpen, setFormOpen] = useState(false);
  const [editQuestion, setEditQuestion] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  useEffect(() => {
    setFilter('search', debouncedSearch);
    setFilter('page', 1);
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchQuestions();
  }, [filters.section, filters.type, filters.difficulty, filters.search, filters.page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (section) => {
    setSearch('');
    setFilter('section', section);
    setFilter('type', '');
    setFilter('difficulty', '');
    setFilter('search', '');
    setFilter('page', 1);
  };

  const handleTypeChange = (v) => {
    setFilter('type', v === 'all' ? '' : v);
    setFilter('page', 1);
  };

  const handleDifficultyChange = (v) => {
    setFilter('difficulty', v === 'all' ? '' : v);
    setFilter('page', 1);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const clearFilters = () => {
    setSearch('');
    resetFilters();
  };

  const openAdd = () => {
    setEditQuestion(null);
    setFormOpen(true);
  };

  const openEdit = (question) => {
    setEditQuestion(question);
    setFormOpen(true);
  };

  const openDelete = (question) => {
    setDeleteTarget(question);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteQuestion(deleteTarget.id);
      toast({ title: 'Question deleted', description: 'The question was removed from the bank.' });
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err?.response?.data?.message ?? 'Failed to delete question.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters = filters.type || filters.difficulty || search;

  const skeletonRows = (cols) =>
    Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        {Array.from({ length: cols }).map((_, j) => (
          <TableCell key={j}>
            <Skeleton className="h-4 w-full" />
          </TableCell>
        ))}
      </TableRow>
    ));

  const actionsCell = (question) => (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => openEdit(question)}
        aria-label="Edit question"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive"
        onClick={() => openDelete(question)}
        aria-label="Delete question"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  const emptyRow = (colSpan) => (
    <TableRow>
      <TableCell colSpan={colSpan} className="p-0">
        <EmptyState
          title="No questions found"
          description="Try adjusting your filters, or add a new question to get started."
        />
      </TableCell>
    </TableRow>
  );

  const renderMCQTable = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Question Text</TableHead>
            <TableHead className="w-24">Type</TableHead>
            <TableHead className="w-28">Difficulty</TableHead>
            <TableHead className="w-24 text-center">Options</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? skeletonRows(5)
            : questions.length === 0
            ? emptyRow(5)
            : questions.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="max-w-sm font-medium">
                    {truncate(q.question_text)}
                  </TableCell>
                  <TableCell className="capitalize">{q.type}</TableCell>
                  <TableCell>
                    <DifficultyBadge difficulty={q.difficulty} />
                  </TableCell>
                  <TableCell className="text-center">
                    {Array.isArray(q.options) ? q.options.length : '—'}
                  </TableCell>
                  <TableCell>{actionsCell(q)}</TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderTechnicalTable = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Question Text</TableHead>
            <TableHead className="w-28">Type</TableHead>
            <TableHead className="w-28">Difficulty</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? skeletonRows(4)
            : questions.length === 0
            ? emptyRow(4)
            : questions.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="max-w-sm font-medium">
                    {truncate(q.question_text)}
                  </TableCell>
                  <TableCell>{q.type === 'written' ? 'Written' : 'MCQ'}</TableCell>
                  <TableCell>
                    <DifficultyBadge difficulty={q.difficulty} />
                  </TableCell>
                  <TableCell>{actionsCell(q)}</TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderCodingTable = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Question Text</TableHead>
            <TableHead className="w-40">Languages</TableHead>
            <TableHead className="w-28 text-center">Test Cases</TableHead>
            <TableHead className="w-28">Difficulty</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? skeletonRows(5)
            : questions.length === 0
            ? emptyRow(5)
            : questions.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="max-w-sm font-medium">
                    {truncate(q.question_text)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {q.boilerplate && typeof q.boilerplate === 'object' &&
                      Object.keys(q.boilerplate).length > 0 ? (
                        Object.keys(q.boilerplate).map((lang) => (
                          <Badge key={lang} variant="secondary" className="text-xs">
                            {lang}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {Array.isArray(q.test_cases) ? q.test_cases.length : '—'}
                  </TableCell>
                  <TableCell>
                    <DifficultyBadge difficulty={q.difficulty} />
                  </TableCell>
                  <TableCell>{actionsCell(q)}</TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Question Bank"
        description={loading ? '' : `${total} question${total !== 1 ? 's' : ''}`}
      >
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </PageHeader>

      <Tabs value={filters.section} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-0">
            {/* Filter bar */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search questions…"
                  value={search}
                  onChange={handleSearchChange}
                  className="pl-9"
                />
              </div>

              {tab.value !== 'coding' && (
                <Select value={filters.type || 'all'} onValueChange={handleTypeChange}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={filters.difficulty || 'all'} onValueChange={handleDifficultyChange}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Difficulties" />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={openAdd}>
                <Plus className="mr-1 h-4 w-4" />
                Add Question
              </Button>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>

            {/* Table */}
            {tab.value === 'technical'
              ? renderTechnicalTable()
              : tab.value === 'coding'
              ? renderCodingTable()
              : renderMCQTable()}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page === 1 || loading}
                  onClick={() => setFilter('page', filters.page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {filters.page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page === totalPages || loading}
                  onClick={() => setFilter('page', filters.page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <QuestionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        section={filters.section}
        question={editQuestion}
        onSuccess={() => {
          fetchQuestions();
          setFormOpen(false);
        }}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the question from the bank. Questions used in
              active exams cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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
