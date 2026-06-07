import { useEffect } from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
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

const INPUT_PARAM_TYPES = [
  { value: 'int',    label: 'Integer',      hint: 'e.g. 42' },
  { value: 'float',  label: 'Float',        hint: 'e.g. 3.14' },
  { value: 'string', label: 'String',       hint: 'e.g. hello world' },
  { value: 'int[]',  label: 'Int Array',    hint: 'space-separated: 1 2 3 4' },
  { value: 'str[]',  label: 'String Array', hint: 'one value per line' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLockedType(section) {
  if (section === 'coding') return 'coding';
  if (section === 'quantitative' || section === 'verbal') return 'mcq';
  return null;
}

// Converts structured input params → stdin string for Judge0
function serializeInputParams(params) {
  if (!Array.isArray(params) || params.length === 0) return '';
  return params
    .map((p) => String(p.value ?? '').trim())
    .filter(Boolean)
    .join('\n');
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
      test_cases: Array.isArray(question.test_cases) && question.test_cases.length > 0
        ? question.test_cases.map((tc) => ({
            // Support old format (plain input string) and new format (input_params)
            input_params: Array.isArray(tc.input_params) && tc.input_params.length > 0
              ? tc.input_params
              : [{ type: 'string', value: String(tc.input ?? '').trim() }],
            expected_output: String(tc.expected_output ?? '').trim(),
          }))
        : [{ input_params: [{ type: 'int', value: '' }], expected_output: '' }],
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
    test_cases: [{ input_params: [{ type: 'int', value: '' }], expected_output: '' }],
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
      input:          serializeInputParams(tc.input_params),
      expected_output: tc.expected_output.trim(),
      input_params:   tc.input_params, // preserve for re-editing
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
      .array(
        z.object({
          input_params: z.array(
            z.object({ type: z.string(), value: z.string() })
          ).optional(),
          expected_output: z.string(),
        })
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'mcq') {
      const opts = data.options ?? [];
      if (opts.length < 2) {
        ctx.addIssue({ code: 'custom', path: ['options'], message: 'At least 2 options are required' });
      } else {
        opts.forEach((opt, i) => {
          if (!opt.value.trim()) {
            ctx.addIssue({ code: 'custom', path: ['options', i, 'value'], message: 'Option cannot be empty' });
          }
        });
      }
      if (!data.correct_answer) {
        ctx.addIssue({ code: 'custom', path: ['correct_answer'], message: 'Correct answer is required' });
      }
    }

    if (data.type === 'written') {
      if (!data.correct_answer?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['correct_answer'], message: 'Model answer is required' });
      }
    }

    if (data.type === 'coding') {
      if (!data.sample_input?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['sample_input'], message: 'Sample input is required' });
      }
      if (!data.sample_output?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['sample_output'], message: 'Sample output is required' });
      }
      const tcs = data.test_cases ?? [];
      if (tcs.length < 1) {
        ctx.addIssue({ code: 'custom', path: ['test_cases'], message: 'At least 1 test case is required' });
      } else {
        tcs.forEach((tc, i) => {
          const params = tc.input_params ?? [];
          if (params.length === 0) {
            ctx.addIssue({ code: 'custom', path: ['test_cases', i, 'input_params'], message: 'At least one input parameter is required' });
          } else {
            params.forEach((p, j) => {
              if (!String(p.value ?? '').trim()) {
                ctx.addIssue({ code: 'custom', path: ['test_cases', i, 'input_params', j, 'value'], message: 'Value is required' });
              }
            });
          }
          if (!tc.expected_output?.trim()) {
            ctx.addIssue({ code: 'custom', path: ['test_cases', i, 'expected_output'], message: 'Expected output is required' });
          }
        });
      }
    }
  });

// ─── Sub-components ───────────────────────────────────────────────────────────

// Renders the value input field based on param type
function ParamValueField({ control, name }) {
  const type = useWatch({ control, name: `${name}.type` });
  const hint = INPUT_PARAM_TYPES.find((t) => t.value === type)?.hint ?? '';

  return (
    <Controller
      control={control}
      name={`${name}.value`}
      render={({ field }) =>
        type === 'str[]' ? (
          <Textarea
            {...field}
            rows={2}
            className="flex-1 font-mono text-xs min-w-0"
            placeholder={hint}
          />
        ) : (
          <Input
            {...field}
            className="flex-1 font-mono text-xs h-8 min-w-0"
            placeholder={hint}
          />
        )
      }
    />
  );
}

// Renders the input params list for one test case
function TestCaseParamsRow({ control, testCaseIndex, errors }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `test_cases.${testCaseIndex}.input_params`,
  });

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">
          Input Parameters
          <span className="ml-1 text-[10px] text-muted-foreground/60">(passed as stdin)</span>
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => append({ type: 'int', value: '' })}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add
        </Button>
      </div>

      {fields.map((paramField, paramIndex) => (
        <div key={paramField.id} className="flex items-start gap-2">
          {/* Type selector */}
          <Controller
            control={control}
            name={`test_cases.${testCaseIndex}.input_params.${paramIndex}.type`}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-[120px] h-8 text-xs shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INPUT_PARAM_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />

          {/* Value field — widget depends on type */}
          <ParamValueField
            control={control}
            name={`test_cases.${testCaseIndex}.input_params.${paramIndex}`}
          />

          {/* Remove param */}
          {fields.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => remove(paramIndex)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}

      {errors?.input_params && !Array.isArray(errors.input_params) && (
        <p className="text-xs text-destructive">{errors.input_params.message}</p>
      )}
    </div>
  );
}

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

  const watchedSection  = watch('section');
  const watchedType     = watch('type');
  const watchedOptions  = watch('options') ?? [];

  useEffect(() => {
    if (open) reset(getDefaultValues(section, question));
  }, [open, section, question]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const locked = getLockedType(watchedSection);
    if (locked) setValue('type', locked);
  }, [watchedSection]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (watchedType !== 'mcq') return;
    const validValues = watchedOptions.map((o) => o.value.trim()).filter(Boolean);
    const current = watch('correct_answer');
    if (current && !validValues.includes(current)) setValue('correct_answer', '');
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

  const isMCQ      = watchedType === 'mcq';
  const isWritten  = watchedType === 'written';
  const isCoding   = watchedType === 'coding';
  const isTechnical = watchedSection === 'technical';
  const validOptionValues = watchedOptions.map((o) => o.value.trim()).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Question' : 'Add Question'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Section + Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Section</Label>
              <Controller
                name="section"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={Boolean(section)}>
                    <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                    <SelectContent>
                      {SECTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.section && <p className="text-xs text-destructive">{errors.section.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Controller
                name="difficulty"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select difficulty" /></SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.difficulty && <p className="text-xs text-destructive">{errors.difficulty.message}</p>}
            </div>
          </div>

          {/* Type — only for Technical */}
          {isTechnical && (
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">MCQ</SelectItem>
                      <SelectItem value="written">Written</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Question text (MCQ + Written) */}
          {!isCoding && (
            <div className="space-y-1.5">
              <Label>Question Text</Label>
              <Textarea rows={3} placeholder="Enter the question…" {...register('question_text')} />
              {errors.question_text && <p className="text-xs text-destructive">{errors.question_text.message}</p>}
            </div>
          )}

          {/* MCQ: Options + Correct Answer */}
          {isMCQ && (
            <>
              <div className="space-y-2">
                <Label>Options</Label>
                {optionFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <span className="w-[72px] shrink-0 text-sm text-muted-foreground">
                      {OPTION_LABELS[index] ?? `Option ${index + 1}`}
                    </span>
                    <Input placeholder={OPTION_LABELS[index]} {...register(`options.${index}.value`)} />
                    {index >= 4 ? (
                      <Button type="button" variant="ghost" size="icon"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removeOption(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <div className="w-9 shrink-0" />
                    )}
                    {errors.options?.[index]?.value && (
                      <p className="text-xs text-destructive">{errors.options[index].value.message}</p>
                    )}
                  </div>
                ))}
                {errors.options && !Array.isArray(errors.options) && (
                  <p className="text-xs text-destructive">{errors.options.message}</p>
                )}
                {optionFields.length < 6 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => appendOption({ value: '' })}>
                    <Plus className="mr-1 h-3 w-3" />Add Option
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Correct Answer</Label>
                <Controller
                  name="correct_answer"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || ''} onValueChange={field.onChange}
                      disabled={validOptionValues.length === 0}>
                      <SelectTrigger><SelectValue placeholder="Select the correct answer" /></SelectTrigger>
                      <SelectContent>
                        {validOptionValues.map((val) => (
                          <SelectItem key={val} value={val}>{val}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.correct_answer && <p className="text-xs text-destructive">{errors.correct_answer.message}</p>}
              </div>
            </>
          )}

          {/* Written: Model Answer */}
          {isWritten && (
            <div className="space-y-1.5">
              <Label>Correct Answer / Model Answer</Label>
              <Textarea rows={4} placeholder="Enter the model answer…" {...register('correct_answer')} />
              {errors.correct_answer && <p className="text-xs text-destructive">{errors.correct_answer.message}</p>}
            </div>
          )}

          {/* ── Coding fields ────────────────────────────────────────────── */}
          {isCoding && (
            <>
              <div className="space-y-1.5">
                <Label>Question Text</Label>
                <Textarea rows={3} placeholder="Describe the coding problem…" {...register('question_text')} />
                {errors.question_text && <p className="text-xs text-destructive">{errors.question_text.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Sample Input</Label>
                  <Textarea rows={3} className="font-mono text-sm"
                    placeholder={'5\n1 2 3 4 5'} {...register('sample_input')} />
                  {errors.sample_input && <p className="text-xs text-destructive">{errors.sample_input.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Sample Output</Label>
                  <Textarea rows={3} className="font-mono text-sm"
                    placeholder="15" {...register('sample_output')} />
                  {errors.sample_output && <p className="text-xs text-destructive">{errors.sample_output.message}</p>}
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
                    <Textarea rows={5} className="font-mono text-sm"
                      placeholder="Optional boilerplate code…" {...register('boilerplate_python')} />
                  </TabsContent>
                  <TabsContent value="javascript" className="mt-2">
                    <Textarea rows={5} className="font-mono text-sm"
                      placeholder="Optional boilerplate code…" {...register('boilerplate_javascript')} />
                  </TabsContent>
                  <TabsContent value="cpp" className="mt-2">
                    <Textarea rows={5} className="font-mono text-sm"
                      placeholder="Optional boilerplate code…" {...register('boilerplate_cpp')} />
                  </TabsContent>
                </Tabs>
              </div>

              {/* ── Test Cases ───────────────────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Test Cases</Label>
                  {errors.test_cases && !Array.isArray(errors.test_cases) && (
                    <p className="text-xs text-destructive">{errors.test_cases.message}</p>
                  )}
                </div>

                {testCaseFields.map((field, tcIndex) => (
                  <div key={field.id} className="rounded-md border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Test Case {tcIndex + 1}
                      </span>
                      {testCaseFields.length > 1 && (
                        <Button type="button" variant="ghost" size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => removeTestCase(tcIndex)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {/* Structured input params */}
                    <TestCaseParamsRow
                      control={control}
                      testCaseIndex={tcIndex}
                      errors={errors.test_cases?.[tcIndex]}
                    />

                    {/* Expected output */}
                    <div className="space-y-1">
                      <Label className="text-xs">Expected Output</Label>
                      <Input
                        className="font-mono text-sm"
                        placeholder="e.g. 42"
                        {...register(`test_cases.${tcIndex}.expected_output`)}
                      />
                      {errors.test_cases?.[tcIndex]?.expected_output && (
                        <p className="text-xs text-destructive">
                          {errors.test_cases[tcIndex].expected_output.message}
                        </p>
                      )}
                    </div>

                    {/* Preview of generated stdin */}
                    <StdinPreview control={control} testCaseIndex={tcIndex} />
                  </div>
                ))}

                {testCaseFields.length < 20 && (
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => appendTestCase({
                      input_params: [{ type: 'int', value: '' }],
                      expected_output: '',
                    })}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add Test Case
                  </Button>
                )}
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
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

// Shows a live preview of the stdin string that will be sent to Judge0
function StdinPreview({ control, testCaseIndex }) {
  const params = useWatch({ control, name: `test_cases.${testCaseIndex}.input_params` });
  const stdin = serializeInputParams(params);
  if (!stdin) return null;
  return (
    <div className="rounded bg-muted/60 px-2 py-1.5">
      <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        stdin preview
      </p>
      <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">{stdin}</pre>
    </div>
  );
}
