import { useCallback, useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Upload, Copy, ChevronDown, ChevronRight, ChevronLeft, PanelLeftClose, PanelLeftOpen, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import useExamSessionStore from '@/store/examSessionStore';
import { CodeOutput } from './CodeOutput';

// ─── Constants ────────────────────────────────────────────────────────────────

const LANGUAGES = ['python', 'javascript', 'cpp'];

const LANGUAGE_LABELS = {
  python: 'Python',
  javascript: 'JavaScript',
  cpp: 'C++',
};

const MONACO_LANGUAGE_MAP = {
  python: 'python',
  javascript: 'javascript',
  cpp: 'cpp',
};

const EMPTY_BOILERPLATE = {
  python: '# Write your solution here\n',
  javascript: '// Write your solution here\n',
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n',
};

// ─── Problem statement panel ──────────────────────────────────────────────────

function CopyButton({ text, className }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-1.5 py-0.5 rounded',
        className
      )}
    >
      {copied ? 'Copied!' : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function CollapsibleTestCase({ tc, index }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className="rounded-md border border-zinc-700/50 overflow-hidden">
      <button
        className="flex w-full items-center justify-between bg-zinc-800/60 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span>Example {index + 1}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="p-3 space-y-2 bg-zinc-900/50">
          <div>
            <p className="text-xs text-zinc-500 mb-1">Input</p>
            <pre className="text-xs font-mono text-zinc-200 whitespace-pre-wrap">
              {String(tc.input ?? '')}
            </pre>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Expected Output</p>
            <pre className="text-xs font-mono text-zinc-200 whitespace-pre-wrap">
              {String(tc.expected_output ?? '')}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function ProblemPanel({ question }) {
  const testCases = Array.isArray(question.test_cases) ? question.test_cases : [];
  const visibleCases = testCases.slice(0, 2);
  const totalCases = testCases.length;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 text-sm">
      {/* Title */}
      <h3 className="font-semibold text-base text-zinc-100 leading-snug">
        {question.title ?? 'Coding Problem'}
      </h3>

      {/* Difficulty badge */}
      {question.difficulty && (
        <span
          className={cn(
            'inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize',
            question.difficulty === 'easy' && 'bg-green-500/15 text-green-400',
            question.difficulty === 'medium' && 'bg-amber-500/15 text-amber-400',
            question.difficulty === 'hard' && 'bg-red-500/15 text-red-400'
          )}
        >
          {question.difficulty}
        </span>
      )}

      {/* Description */}
      <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
        {question.question_text}
      </div>

      <hr className="border-zinc-700/50" />

      {/* Sample input/output */}
      {question.sample_input != null && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Sample Input
            </p>
            <CopyButton text={String(question.sample_input)} />
          </div>
          <pre className="rounded-md bg-zinc-900 border border-zinc-700/50 px-3 py-2 text-xs font-mono text-zinc-200 whitespace-pre-wrap overflow-x-auto">
            {String(question.sample_input)}
          </pre>
        </div>
      )}

      {question.sample_output != null && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Sample Output
          </p>
          <pre className="rounded-md bg-zinc-900 border border-zinc-700/50 px-3 py-2 text-xs font-mono text-zinc-200 whitespace-pre-wrap overflow-x-auto">
            {String(question.sample_output)}
          </pre>
        </div>
      )}

      <hr className="border-zinc-700/50" />

      {/* Test cases note */}
      <p className="text-xs text-zinc-500">
        {totalCases} test case{totalCases !== 1 ? 's' : ''} —{' '}
        <span className="italic">hidden inputs will be tested on submission</span>
      </p>

      {/* Visible (sample) test cases */}
      {visibleCases.length > 0 && (
        <div className="space-y-2">
          {visibleCases.map((tc, i) => (
            <CollapsibleTestCase key={i} tc={tc} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Confirm submit dialog ────────────────────────────────────────────────────

function ConfirmSubmitOverlay({ onConfirm, onCancel }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl w-80 space-y-4">
        <h4 className="font-semibold text-sm text-zinc-100">Submit code?</h4>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Your code will be evaluated against all test cases. You can re-submit as long as the exam
          is active.
        </p>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onCancel} className="border-zinc-600">
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm}>
            Submit Code
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CodeEditor({ question, candidateExamId, onCodeSubmit }) {
  const { codeByQuestion, saveCode, saveCodeResult, answers, codeResults } = useExamSessionStore();

  const isSubmitted = answers[question.id]?.code_submitted === true;

  const [panelCollapsed, setPanelCollapsed] = useState(false);

  // Initialise language from question boilerplate or defaults
  const [activeLanguage, setActiveLanguage] = useState('python');
  const [runResult, setRunResult] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [outputType, setOutputType] = useState(null); // 'run' | 'submit'
  const [runLoading, setRunLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const editorRef = useRef(null);
  const autoSaveRef = useRef(null);

  // Restore last submit result from persisted store on mount (e.g. page reload)
  useEffect(() => {
    if (isSubmitted && codeResults[question.id]) {
      setSubmitResult(codeResults[question.id]);
      setOutputType('submit');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Code state helpers ─────────────────────────────────────────────────────

  const getBoilerplate = useCallback(
    (lang) => {
      const stored = codeByQuestion[question.id]?.[lang];
      // Only use stored code if the candidate actually typed something;
      // an empty string falls back to the question boilerplate so admin
      // edits are visible until the candidate starts writing.
      if (stored != null && stored.trim() !== '') return stored;
      return question.boilerplate?.[lang] ?? EMPTY_BOILERPLATE[lang] ?? '';
    },
    [codeByQuestion, question.id, question.boilerplate]
  );

  const getCurrentCode = () => {
    return editorRef.current?.getValue() ?? getBoilerplate(activeLanguage);
  };

  // ── Auto-save every 30 seconds ──────────────────────────────────────────────

  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      const code = editorRef.current?.getValue();
      if (code != null) {
        saveCode(question.id, activeLanguage, code);
        setLastSaved(new Date());
      }
    }, 30_000);
    return () => clearInterval(autoSaveRef.current);
  }, [activeLanguage, question.id, saveCode]);

  // ── Language switch ─────────────────────────────────────────────────────────

  const handleLanguageChange = (lang) => {
    const code = getCurrentCode();
    saveCode(question.id, activeLanguage, code);
    setActiveLanguage(lang);
  };

  // ── Run ─────────────────────────────────────────────────────────────────────

  const handleRun = async () => {
    const code = getCurrentCode();
    setRunLoading(true);
    setOutputType('run');
    setRunResult(null);
    setSubmitResult(null);
    try {
      const { data } = await api.post('/code/run', {
        source_code: code,
        language: activeLanguage,
        sample_input: question.sample_input ?? '',
        candidate_exam_id: candidateExamId,
        question_id: question.id,
      });
      setRunResult(data.data);
    } catch (err) {
      setRunResult({
        stdout: null,
        stderr: err.response?.data?.message ?? 'Request failed',
        status: 'Error',
        status_id: 0,
      });
    } finally {
      setRunLoading(false);
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setShowConfirm(false);
    const code = getCurrentCode();
    setSubmitLoading(true);
    setOutputType('submit');
    setRunResult(null);
    setSubmitResult(null);
    try {
      const { data } = await api.post('/code/submit', {
        source_code: code,
        language: activeLanguage,
        candidate_exam_id: candidateExamId,
        question_id: question.id,
      });
      const result = data.data;
      setSubmitResult(result);
      saveCodeResult(question.id, result);
      saveCode(question.id, activeLanguage, code);
      setLastSaved(new Date());
      if (onCodeSubmit) onCodeSubmit(result);
    } catch (err) {
      setSubmitResult({
        results: [],
        passed_cases: 0,
        total_cases: 0,
        score: 0,
        error: err.response?.data?.message ?? 'Submission failed',
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Keyboard shortcut Ctrl+Enter ────────────────────────────────────────────

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    editor.addCommand(
      // eslint-disable-next-line no-bitwise
      (window.monaco?.KeyMod?.CtrlCmd ?? 0) | (window.monaco?.KeyCode?.Enter ?? 0),
      handleRun
    );
  };

  const isLoading = runLoading || submitLoading;
  const activeOutput = outputType === 'run' ? runResult : submitResult;

  return (
    <div className="flex h-full overflow-hidden bg-zinc-950 text-zinc-100">
      {/* ── Left: problem statement (collapsible) ────────────────────────── */}
      <div
        className="shrink-0 border-r border-zinc-700/50 overflow-hidden transition-all duration-200"
        style={{ width: panelCollapsed ? 0 : '40%' }}
      >
        <ProblemPanel question={question} />
      </div>

      {/* ── Right: editor + output ─────────────────────────────────────────*/}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Confirm overlay */}
        {showConfirm && (
          <ConfirmSubmitOverlay
            onConfirm={handleSubmit}
            onCancel={() => setShowConfirm(false)}
          />
        )}

        {/* Language tabs + panel toggle */}
        <div className="border-b border-zinc-700/50 bg-zinc-900 px-3 pt-2 pb-0 shrink-0 flex items-center justify-between">
          <Tabs value={activeLanguage} onValueChange={handleLanguageChange}>
            <TabsList className="bg-transparent h-8 gap-0 p-0">
              {LANGUAGES.map((lang) => (
                <TabsTrigger
                  key={lang}
                  value={lang}
                  className={cn(
                    'rounded-none border-b-2 border-transparent px-4 py-1.5 text-xs font-medium',
                    'data-[state=active]:border-blue-500 data-[state=active]:text-blue-400',
                    'data-[state=active]:bg-transparent data-[state=inactive]:text-zinc-400',
                    'hover:text-zinc-200 transition-colors',
                  )}
                >
                  {LANGUAGE_LABELS[lang]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <button
            onClick={() => setPanelCollapsed((p) => !p)}
            title={panelCollapsed ? 'Show problem' : 'Hide problem'}
            className="mb-1 flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
          >
            {panelCollapsed
              ? <><PanelLeftOpen className="h-3.5 w-3.5" /><span>Problem</span></>
              : <><PanelLeftClose className="h-3.5 w-3.5" /><span>Hide</span></>
            }
          </button>
        </div>

        {/* Monaco editor — fills all available vertical space */}
        <div className="flex-1 min-h-0">
          <Editor
            key={`${question.id}-${activeLanguage}`}
            language={MONACO_LANGUAGE_MAP[activeLanguage]}
            value={getBoilerplate(activeLanguage)}
            theme="vs-dark"
            onMount={handleEditorDidMount}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              lineNumbers: 'on',
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              renderLineHighlight: 'line',
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontLigatures: true,
            }}
          />
        </div>

        {/* Output panel */}
        <CodeOutput
          type={outputType}
          result={activeOutput}
          loading={isLoading}
        />

        {/* Action bar */}
        <div className="flex items-center justify-between border-t border-zinc-700/50 bg-zinc-900 px-3 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 border-zinc-600 bg-transparent text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 text-xs"
              onClick={handleRun}
              disabled={isLoading}
            >
              {runLoading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
              )}
              Run
            </Button>

            <Button
              size="sm"
              className="h-7 text-xs bg-blue-600 hover:bg-blue-500"
              onClick={() => setShowConfirm(true)}
              disabled={isLoading}
            >
              {submitLoading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-3.5 w-3.5" />
              )}
              Submit Code
            </Button>

            {isSubmitted && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                Submitted
              </span>
            )}

            {!isSubmitted && (
              <span className="hidden text-xs text-zinc-500 sm:inline">
                Ctrl+Enter to Run
              </span>
            )}
          </div>

          {lastSaved && (
            <span className="text-xs text-zinc-500">
              Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
