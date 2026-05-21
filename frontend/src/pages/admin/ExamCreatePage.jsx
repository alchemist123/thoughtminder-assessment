import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { getQuestions } from '@/services/questionService';
import useExamStore from '@/store/examStore';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = ['Basic Info', 'Select Questions', 'Review & Save'];

const SECTIONS_CONFIG = [
  { value: 'quantitative', label: 'Quantitative Aptitude' },
  { value: 'verbal', label: 'Verbal' },
  { value: 'technical', label: 'Technical' },
  { value: 'coding', label: 'Coding' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'mcq', label: 'MCQ' },
  { value: 'written', label: 'Written' },
];

const PANEL_LIMIT = 10;

function truncate(text, max = 90) {
  if (!text) return '—';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, steps }) {
  return (
    <div className="mb-8 flex items-center justify-center">
      {steps.map((label, idx) => {
        const stepNum = idx + 1;
        const done = stepNum < current;
        const active = stepNum === current;
        return (
          <div key={stepNum} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                  active && 'bg-primary text-primary-foreground',
                  done && 'bg-primary/20 text-primary',
                  !active && !done && 'bg-muted text-muted-foreground'
                )}
              >
                {stepNum}
              </div>
              <span
                className={cn(
                  'text-xs',
                  active ? 'font-medium text-foreground' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'mx-3 mb-5 h-px w-16',
                  done ? 'bg-primary/40' : 'bg-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Section Panel (Step 2) ───────────────────────────────────────────────────

function SectionPanel({ section, sectionLabel, selectedQuestions, onToggle }) {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [panelLoading, setPanelLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  const totalPages = Math.max(1, Math.ceil(total / PANEL_LIMIT));
  const selectedCount = selectedQuestions.size;

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setPanelLoading(true);
      try {
        const params = { section, page, limit: PANEL_LIMIT };
        if (debouncedSearch) params.search = debouncedSearch;
        if (type) params.type = type;
        const data = await getQuestions(params);
        if (!cancelled) {
          setQuestions(data?.questions ?? []);
          setTotal(data?.pagination?.total ?? 0);
        }
      } catch {
        if (!cancelled) setQuestions([]);
      } finally {
        if (!cancelled) setPanelLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [section, debouncedSearch, type, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleType = (v) => {
    setType(v === 'all' ? '' : v);
    setPage(1);
  };

  const allOnPage =
    questions.length > 0 && questions.every((q) => selectedQuestions.has(q.id));

  const togglePageAll = () => {
    if (allOnPage) {
      questions.forEach((q) => onToggle(q, false));
    } else {
      questions.forEach((q) => {
        if (!selectedQuestions.has(q.id)) onToggle(q, true);
      });
    }
  };

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          {collapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">{sectionLabel}</span>
          {selectedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedCount} selected
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{total} available</span>
      </button>

      {!collapsed && (
        <div className="border-t p-4 space-y-3">
          {/* Filter bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search questions…"
                value={search}
                onChange={handleSearch}
                className="pl-9"
              />
            </div>
            {section !== 'coding' && (
              <Select value={type || 'all'} onValueChange={handleType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
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
          </div>

          {/* Select all on page */}
          {questions.length > 0 && (
            <div className="flex items-center gap-2 border-b pb-2">
              <Checkbox
                id={`${section}-all`}
                checked={allOnPage}
                onCheckedChange={togglePageAll}
              />
              <label
                htmlFor={`${section}-all`}
                className="cursor-pointer text-sm text-muted-foreground"
              >
                Select all on this page
              </label>
            </div>
          )}

          {/* Question list */}
          {panelLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : questions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No questions found.
            </p>
          ) : (
            <div className="space-y-1">
              {questions.map((q) => {
                const checked = selectedQuestions.has(q.id);
                return (
                  <label
                    key={q.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/50',
                      checked && 'bg-muted/50'
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => onToggle(q, Boolean(v))}
                      className="mt-0.5 shrink-0"
                    />
                    <span className="flex-1 leading-snug">{truncate(q.question_text)}</span>
                    <span className="shrink-0 text-xs text-muted-foreground capitalize">
                      {q.type}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page === 1 || panelLoading}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page === totalPages || panelLoading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ExamCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { createExam } = useExamStore();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 state
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [sections, setSections] = useState(new Set());
  const [step1Errors, setStep1Errors] = useState({});

  // Step 2 state: { section: Map<id, question> }
  const [selectedQuestions, setSelectedQuestions] = useState({});

  // Carry forward pre-selected candidate ids (from CandidatesPage "Launch for selected" flow)
  const preSelectedCandidateIds = location.state?.candidateIds ?? [];

  const orderedSections = SECTIONS_CONFIG.filter((s) => sections.has(s.value));

  // ── Step 1 ────────────────────────────────────────────────────────────────

  const validateStep1 = () => {
    const errs = {};
    if (!title.trim()) errs.title = 'Title is required';
    const dur = parseInt(duration, 10);
    if (!duration || isNaN(dur) || dur < 1)
      errs.duration = 'Duration must be a positive number';
    if (sections.size === 0) errs.sections = 'Select at least one section';
    setStep1Errors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleStep1Next = () => {
    if (!validateStep1()) return;
    // Preserve existing selections, clean up removed sections
    setSelectedQuestions((prev) => {
      const updated = {};
      for (const sec of sections) {
        updated[sec] = prev[sec] ?? new Map();
      }
      return updated;
    });
    setStep(2);
  };

  const toggleSection = (value, checked) => {
    setSections((prev) => {
      const next = new Set(prev);
      checked ? next.add(value) : next.delete(value);
      return next;
    });
  };

  // ── Step 2 ────────────────────────────────────────────────────────────────

  const handleToggleQuestion = (section, question, checked) => {
    setSelectedQuestions((prev) => {
      const current = new Map(prev[section] ?? []);
      if (checked) {
        current.set(question.id, question);
      } else {
        current.delete(question.id);
      }
      return { ...prev, [section]: current };
    });
  };

  const allSectionsHaveQuestions = orderedSections.every(
    (s) => (selectedQuestions[s.value]?.size ?? 0) > 0
  );

  const totalSelectedCount = orderedSections.reduce(
    (sum, s) => sum + (selectedQuestions[s.value]?.size ?? 0),
    0
  );

  // ── Step 3 ────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    const allQuestionIds = orderedSections.flatMap((s) =>
      Array.from(selectedQuestions[s.value]?.keys() ?? [])
    );

    setSubmitting(true);
    try {
      const exam = await createExam({
        title: title.trim(),
        duration_minutes: parseInt(duration, 10),
        sections: orderedSections.map((s) => s.value),
        question_ids: allQuestionIds,
      });
      toast({ title: 'Exam created', description: `"${exam.title}" saved as draft.` });
      navigate(`/admin/exams/${exam.id}`, {
        state: { created: true, preSelectedCandidateIds },
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message ?? 'Failed to create exam.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Create Exam"
        description="Configure a new exam in three steps."
      />

      <StepIndicator current={step} steps={STEPS} />

      {/* ── Step 1: Basic Info ─────────────────────────────────────────── */}
      {step === 1 && (
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="exam-title">Exam Title</Label>
              <Input
                id="exam-title"
                placeholder="e.g. Campus Placement Drive 2024"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              {step1Errors.title && (
                <p className="text-xs text-destructive">{step1Errors.title}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exam-duration">Duration (minutes)</Label>
              <Input
                id="exam-duration"
                type="number"
                min={1}
                placeholder="e.g. 90"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-40"
              />
              {step1Errors.duration && (
                <p className="text-xs text-destructive">{step1Errors.duration}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Sections to Include</Label>
              <div className="grid grid-cols-2 gap-2">
                {SECTIONS_CONFIG.map((sec) => (
                  <label
                    key={sec.value}
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 rounded-md border p-3 transition-colors hover:bg-muted/50',
                      sections.has(sec.value) && 'border-primary bg-primary/5'
                    )}
                  >
                    <Checkbox
                      checked={sections.has(sec.value)}
                      onCheckedChange={(v) => toggleSection(sec.value, Boolean(v))}
                    />
                    <span className="text-sm font-medium">{sec.label}</span>
                  </label>
                ))}
              </div>
              {step1Errors.sections && (
                <p className="text-xs text-destructive">{step1Errors.sections}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={handleStep1Next}>Next →</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Select Questions ───────────────────────────────────── */}
      {step === 2 && (
        <div className="grid grid-cols-3 gap-6">
          {/* Section panels */}
          <div className="col-span-2 space-y-4">
            {orderedSections.map((sec) => (
              <SectionPanel
                key={sec.value}
                section={sec.value}
                sectionLabel={sec.label}
                selectedQuestions={selectedQuestions[sec.value] ?? new Map()}
                onToggle={(q, checked) =>
                  handleToggleQuestion(sec.value, q, checked)
                }
              />
            ))}
          </div>

          {/* Sidebar summary */}
          <div>
            <div className="sticky top-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Selected Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {orderedSections.map((sec) => {
                    const count = selectedQuestions[sec.value]?.size ?? 0;
                    const hasMin = count > 0;
                    return (
                      <div key={sec.value} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{sec.label}</span>
                        <span
                          className={cn(
                            'text-sm font-medium',
                            hasMin ? 'text-green-600' : 'text-destructive'
                          )}
                        >
                          {count}
                        </span>
                      </div>
                    );
                  })}
                  <div className="border-t pt-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-sm font-bold">{totalSelectedCount}</span>
                  </div>
                  {!allSectionsHaveQuestions && (
                    <p className="text-xs text-destructive">
                      Select at least 1 question per section.
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => setStep(3)}
                  disabled={!allSectionsHaveQuestions}
                >
                  Next →
                </Button>
                <Button variant="outline" onClick={() => setStep(1)}>
                  ← Back
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Review & Save ──────────────────────────────────────── */}
      {step === 3 && (
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Summary card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Exam Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Title</span>
                <span className="text-sm font-medium">{title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="text-sm font-medium">{duration} minutes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sections</span>
                <div className="flex gap-1">
                  {orderedSections.map((s) => (
                    <Badge key={s.value} variant="secondary" className="text-xs">
                      {s.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Questions</span>
                <span className="text-sm font-medium">{totalSelectedCount}</span>
              </div>
            </CardContent>
          </Card>

          {/* Questions per section */}
          {orderedSections.map((sec) => {
            const qs = Array.from(selectedQuestions[sec.value]?.values() ?? []);
            return (
              <Card key={sec.value}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span>{sec.label}</span>
                    <Badge variant="secondary">{qs.length} questions</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-1.5 list-decimal list-inside">
                    {qs.map((q) => (
                      <li key={q.id} className="text-sm text-muted-foreground leading-snug">
                        {truncate(q.question_text, 100)}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            );
          })}

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep(2)} disabled={submitting}>
              ← Back
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Exam'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
