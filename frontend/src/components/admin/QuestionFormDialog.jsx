import { useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import useQuestionStore from '@/store/questionStore';

// ─── Constants ───────────────────────────────────────────────────────────────

const SECTIONS = [
  { value: 'quantitative', label: 'Quantitative Aptitude' },
  { value: 'verbal', label: 'Verbal' },
  { value: 'technical', label: 'Technical' },
  { value: 'coding', label: 'Coding' },
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const OPTION_LABELS = ['Option A', 'Option B', 'Option C', 'Option D', 'Option E', 'Option F'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLockedType(section) {
  if (section === 'coding') return 'coding';
  if (section === 'quantitative' || section === 'verbal') return 'mcq';
  return null; // technical: user picks
}

function getDefaultValues(section, question) {
  const lockedType = getLockedType(section);

  if (question) {
    return {
      section: question.section,
      difficulty: question.difficulty ?? 'medium',
      type: question.type,
      question_text: question.question_text ?? '',
      options: Array.isArray(question.options) && question.options.length > 0
        ? question.options.map((v) => ({ value: v }))
        : [{ value: '' }, { value: '' }, { value: '' }, { value: '' }],
      correct_answer: question.correct_answer ?? '',
      sample_input: question.sample_input ?? '',
      sample_output: question.sample_output ?? '',
      boilerplate_python: question.boilerplate?.python ?? '',
      boilerplate_javascript: question.boilerplate?.javascript ?? '',
      boilerplate_cpp: question.boilerplate?.cpp ?? '',
      test_cases:
        Array.isArray(question.test_cases) && question.test_cases.length > 0
          ? question.test_cases.map((tc) => ({
              input: tc.input ?? '',
              expected_output: tc.expected_output ?? '',
            }))
          : [{ input: '', expected_output: '' }],
    };
  }

  return {
    section,
    difficulty: 'medium',
    type: lockedType ?? 'mcq',
    question_text: '',
    options: [{ value: '' }, { value: '' }, { value: '' }, { value: '' }],
    correct_answer: '',
    sample_input: '',
    sample_output: '',
    boilerplate_python: '',
    boilerplate_javascript: '',
    boilerplate_cpp: '',
    test_cases: [{ input: '', expected_output: '' }],
  };
}

function buildPayload(data) {
  const payload = {
    section: data.section,
    difficulty: data.difficulty,
    type: data.type,
    question_text: data.question_text.trim(),
  };

  if (data.type === 'mcq') {
    payload.options = (data.options ?? []).map((o) => o.value.trim());
    payload.correct_answer = data.correct_answer;
  }

  if (data.type === 'written') {
    payload.correct_answer = data.correct_answer.trim();
  }

  if (data.type === 'coding') {
    payload.sample_input = data.sample_input.trim();
    payload.sample_output = data.sample_output.trim();

    const bp = {};
    if (data.boilerplate_python?.trim()) bp.python = data.boilerplate_python.trim();
    if (data.boilerplate_javascript?.trim()) bp.javascript = data.boilerplate_javascript.trim();
    if (data.boilerplate_cpp?.trim()) bp.cpp = data.boilerplate_cpp.trim();
    if (Object.keys(bp).length > 0) payload.boilerplate = bp;

    payload.test_cases = (data.test_cases ?? []).map((tc) => ({
      input: tc.input,
      expected_output: tc.expected_output,
    }));
  }

  return payload;
}

// ─── Zod schema ──────────────────────────────────────────────────────────────

const schema = z
  .object({
    section: z.string().min(1, 'Section is required'),
    difficulty: z.string().min(1, 'Difficulty is required'),
    type: z.string().min(1, 'Type is required'),
    question_text: z.string().min(1, 'Question text is required'),
    options: z.array(z.object({ value: z.string() })).optional(),
    correct_answer: z.string().optional(),
    sample_input: z.string().optional(),
    sample_output: z.string().optional(),
    boilerplate_python: z.string().optional(),
    boilerplate_javascript: z.string().optional(),
    boilerplate_cpp: z.string().optional(),
    test_cases: z
      .array(z.object({ input: z.string(), expected_output: z.string() }))
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'mcq') {
      const opts = data.options ?? [];
      if (opts.length < 2) {
        ctx.addIssue({
          code: 'custom',
          path: ['options'],
          message: 'At least 2 options are required',
        });
      } else {
        opts.forEach((opt, i) => {
          if (!opt.value.trim()) {
            ctx.addIssue({
              code: 'custom',
              path: ['options', i, 'value'],
              message: 'Option cannot be empty',
            });
          }
        });
      }
      if (!data.correct_answer) {
        ctx.addIssue({
          code: 'custom',
          path: ['correct_answer'],
          message: 'Correct answer is required',
        });
      }
    }

    if (data.type === 'written') {
      if (!data.correct_answer?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['correct_answer'],
          message: 'Model answer is required',
        });
      }
    }

    if (data.type === 'coding') {
      if (!data.sample_input?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['sample_input'],
          message: 'Sample input is required',
        });
      }
      if (!data.sample_output?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['sample_output'],
          message: 'Sample output is required',
        });
      }
      const tcs = data.test_cases ?? [];
      if (tcs.length < 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['test_cases'],
          message: 'At least 1 test case is required',
        });
      } else {
        tcs.forEach((tc, i) => {
          if (!tc.input.trim()) {
            ctx.addIssue({
              code: 'custom',
              path: ['test_cases', i, 'input'],
              message: 'Input is required',
            });
          }
          if (!tc.expected_output.trim()) {
            ctx.addIssue({
              code: 'custom',
              path: ['test_cases', i, 'expected_output'],
              message: 'Expected output is required',
            });
          }
        });
      }
    }
  });

// ─── Component ───────────────────────────────────────────────────────────────

export function QuestionFormDialog({ open, onOpenChange, section, question, onSuccess }) {
  const { toast } = useToast();
  const { createQuestion, updateQuestion } = useQuestionStore();
  const isEdit = Boolean(question);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(section, question),
    mode: 'onChange',
  });

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: 'options',
  });

  const { fields: testCaseFields, append: appendTestCase, remove: removeTestCase } = useFieldArray({
    control,
    name: 'test_cases',
  });

  const watchedSection = watch('section');
  const watchedType = watch('type');
  const watchedOptions = watch('options') ?? [];

  // Reset form whenever the dialog opens or the question prop changes
  useEffect(() => {
    if (open) {
      reset(getDefaultValues(section, question));
    }
  }, [open, section, question]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep type locked for non-technical sections
  useEffect(() => {
    const locked = getLockedType(watchedSection);
    if (locked) setValue('type', locked);
  }, [watchedSection]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear correct_answer when it no longer matches any option value
  useEffect(() => {
    if (watchedType !== 'mcq') return;
    const validValues = watchedOptions.map((o) => o.value.trim()).filter(Boolean);
    const current = watch('correct_answer');
    if (current && !validValues.includes(current)) {
      setValue('correct_answer', '');
    }
  }, [watchedOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data) => {
    const payload = buildPayload(data);
    try {
      if (isEdit) {
        await updateQuestion(question.id, payload);
        toast({ title: 'Question updated', description: 'Changes saved successfully.' });
      } else {
        await createQuestion(payload);
        toast({ title: 'Question created', description: 'New question added to the bank.' });
      }
      onSuccess?.();
    } catch (err) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message ?? 'Failed to save question.',
        variant: 'destructive',
      });
    }
  };

  const isMCQ = watchedType === 'mcq';
  const isWritten = watchedType === 'written';
  const isCoding = watchedType === 'coding';
  const isTechnical = watchedSection === 'technical';
  const validOptionValues = watchedOptions.map((o) => o.value.trim()).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Question' : 'Add Question'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Section + Difficulty row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Section</Label>
              <Controller
                name="section"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={Boolean(section)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.section && (
                <p className="text-xs text-destructive">{errors.section.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Controller
                name="difficulty"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.difficulty && (
                <p className="text-xs text-destructive">{errors.difficulty.message}</p>
              )}
            </div>
          </div>

          {/* Type — only visible and editable for Technical */}
          {isTechnical && (
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">MCQ</SelectItem>
                      <SelectItem value="written">Written</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* ── Question text (MCQ + Written) ─────────────────────────── */}
          {!isCoding && (
            <div className="space-y-1.5">
              <Label>Question Text</Label>
              <Textarea
                rows={3}
                placeholder="Enter the question…"
                {...register('question_text')}
              />
              {errors.question_text && (
                <p className="text-xs text-destructive">{errors.question_text.message}</p>
              )}
            </div>
          )}

          {/* ── MCQ: Options + Correct Answer ─────────────────────────── */}
          {isMCQ && (
            <>
              <div className="space-y-2">
                <Label>Options</Label>
                {optionFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <span className="w-[72px] shrink-0 text-sm text-muted-foreground">
                      {OPTION_LABELS[index] ?? `Option ${index + 1}`}
                    </span>
                    <Input
                      placeholder={OPTION_LABELS[index] ?? `Option ${index + 1}`}
                      {...register(`options.${index}.value`)}
                    />
                    {/* Remove button only for options beyond the first 4 */}
                    {index >= 4 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removeOption(index)}
                        aria-label={`Remove ${OPTION_LABELS[index]}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <div className="w-9 shrink-0" />
                    )}
                    {errors.options?.[index]?.value && (
                      <p className="text-xs text-destructive">
                        {errors.options[index].value.message}
                      </p>
                    )}
                  </div>
                ))}
                {errors.options && !Array.isArray(errors.options) && (
                  <p className="text-xs text-destructive">{errors.options.message}</p>
                )}
                {optionFields.length < 6 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendOption({ value: '' })}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Option
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Correct Answer</Label>
                <Controller
                  name="correct_answer"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      disabled={validOptionValues.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select the correct answer" />
                      </SelectTrigger>
                      <SelectContent>
                        {validOptionValues.map((val) => (
                          <SelectItem key={val} value={val}>
                            {val}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.correct_answer && (
                  <p className="text-xs text-destructive">{errors.correct_answer.message}</p>
                )}
              </div>
            </>
          )}

          {/* ── Written: Model Answer ─────────────────────────────────── */}
          {isWritten && (
            <div className="space-y-1.5">
              <Label>Correct Answer / Model Answer</Label>
              <Textarea
                rows={4}
                placeholder="Enter the model answer…"
                {...register('correct_answer')}
              />
              {errors.correct_answer && (
                <p className="text-xs text-destructive">{errors.correct_answer.message}</p>
              )}
            </div>
          )}

          {/* ── Coding fields ─────────────────────────────────────────── */}
          {isCoding && (
            <>
              <div className="space-y-1.5">
                <Label>Question Text</Label>
                <Textarea
                  rows={3}
                  placeholder="Describe the coding problem…"
                  {...register('question_text')}
                />
                {errors.question_text && (
                  <p className="text-xs text-destructive">{errors.question_text.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Sample Input</Label>
                  <Textarea
                    rows={3}
                    className="font-mono text-sm"
                    placeholder={'5\n1 2 3 4 5'}
                    {...register('sample_input')}
                  />
                  {errors.sample_input && (
                    <p className="text-xs text-destructive">{errors.sample_input.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Sample Output</Label>
                  <Textarea
                    rows={3}
                    className="font-mono text-sm"
                    placeholder="15"
                    {...register('sample_output')}
                  />
                  {errors.sample_output && (
                    <p className="text-xs text-destructive">{errors.sample_output.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Boilerplate Code</Label>
                <Tabs defaultValue="python" className="mt-1">
                  <TabsList>
                    <TabsTrigger value="python">Python</TabsTrigger>
                    <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                    <TabsTrigger value="cpp">C++</TabsTrigger>
                  </TabsList>
                  <TabsContent value="python" className="mt-2">
                    <Textarea
                      rows={5}
                      className="font-mono text-sm"
                      placeholder="Optional boilerplate code…"
                      {...register('boilerplate_python')}
                    />
                  </TabsContent>
                  <TabsContent value="javascript" className="mt-2">
                    <Textarea
                      rows={5}
                      className="font-mono text-sm"
                      placeholder="Optional boilerplate code…"
                      {...register('boilerplate_javascript')}
                    />
                  </TabsContent>
                  <TabsContent value="cpp" className="mt-2">
                    <Textarea
                      rows={5}
                      className="font-mono text-sm"
                      placeholder="Optional boilerplate code…"
                      {...register('boilerplate_cpp')}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              <div className="space-y-2">
                <Label>Test Cases</Label>
                {errors.test_cases && !Array.isArray(errors.test_cases) && (
                  <p className="text-xs text-destructive">{errors.test_cases.message}</p>
                )}
                {testCaseFields.map((field, index) => (
                  <div key={field.id} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Test Case {index + 1}
                      </span>
                      {testCaseFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => removeTestCase(index)}
                          aria-label={`Remove test case ${index + 1}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Input</Label>
                        <Textarea
                          rows={2}
                          className="font-mono text-sm"
                          {...register(`test_cases.${index}.input`)}
                        />
                        {errors.test_cases?.[index]?.input && (
                          <p className="text-xs text-destructive">
                            {errors.test_cases[index].input.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Expected Output</Label>
                        <Textarea
                          rows={2}
                          className="font-mono text-sm"
                          {...register(`test_cases.${index}.expected_output`)}
                        />
                        {errors.test_cases?.[index]?.expected_output && (
                          <p className="text-xs text-destructive">
                            {errors.test_cases[index].expected_output.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {testCaseFields.length < 20 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendTestCase({ input: '', expected_output: '' })}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Test Case
                  </Button>
                )}
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Question'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
