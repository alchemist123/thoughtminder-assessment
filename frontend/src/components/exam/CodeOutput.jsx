import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

// ─── Run result ────────────────────────────────────────────────────────────────

function RunOutput({ result }) {
  const hasError = result.stderr || (result.status_id !== 3 && result.status_id !== undefined);
  const compileError = result.compile_output && result.compile_output.trim();

  return (
    <div className="space-y-3">
      {/* Status badge + time */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant="outline"
          className={cn(
            'text-xs font-medium',
            result.status_id === 3
              ? 'border-green-500/40 text-green-400 bg-green-500/10'
              : 'border-red-500/40 text-red-400 bg-red-500/10'
          )}
        >
          {result.status ?? 'Unknown'}
        </Badge>
        {result.time && (
          <span className="flex items-center gap-1 text-xs text-zinc-400">
            <Clock className="h-3 w-3" />
            {result.time}s
          </span>
        )}
      </div>

      {/* Compile error */}
      {compileError && (
        <div>
          <p className="mb-1 text-xs font-medium text-red-400 uppercase tracking-wide">
            Compile Error
          </p>
          <pre className="rounded-md bg-red-950/40 border border-red-500/20 px-3 py-2.5 text-xs font-mono text-red-300 whitespace-pre-wrap overflow-x-auto">
            {compileError}
          </pre>
        </div>
      )}

      {/* stdout */}
      {!compileError && (
        <div>
          <p className="mb-1 text-xs font-medium text-zinc-400 uppercase tracking-wide">Output</p>
          <pre className="rounded-md bg-zinc-900 border border-zinc-700/50 px-3 py-2.5 text-xs font-mono text-zinc-100 whitespace-pre-wrap overflow-x-auto min-h-[48px]">
            {result.stdout?.trim() || <span className="text-zinc-500">(no output)</span>}
          </pre>
        </div>
      )}

      {/* stderr */}
      {result.stderr && result.stderr.trim() && (
        <div>
          <p className="mb-1 text-xs font-medium text-red-400 uppercase tracking-wide">Stderr</p>
          <pre className="rounded-md bg-red-950/40 border border-red-500/20 px-3 py-2.5 text-xs font-mono text-red-300 whitespace-pre-wrap overflow-x-auto">
            {result.stderr.trim()}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Submit result ─────────────────────────────────────────────────────────────

function SubmitOutput({ result }) {
  const { passed_cases = 0, total_cases = 0, score = 0, results = [] } = result;
  const allPassed = passed_cases === total_cases;
  const passPercent = total_cases > 0 ? Math.round((passed_cases / total_cases) * 100) : 0;

  // Check for a compile error (first result has compile_output and status != Accepted)
  const firstResult = results[0];
  const compileError =
    firstResult?.compile_output &&
    firstResult.compile_output.trim() &&
    firstResult.status_id !== 3;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {allPassed ? (
            <CheckCircle2 className="h-5 w-5 text-green-400" />
          ) : (
            <XCircle className="h-5 w-5 text-red-400" />
          )}
          <span className="font-medium text-sm">
            {passed_cases} / {total_cases} test cases passed
          </span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'text-xs font-semibold',
            allPassed
              ? 'border-green-500/40 text-green-400 bg-green-500/10'
              : passed_cases > 0
              ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
              : 'border-red-500/40 text-red-400 bg-red-500/10'
          )}
        >
          Score: {score} / 10
        </Badge>
      </div>

      {/* Progress bar */}
      <Progress
        value={passPercent}
        className="h-1.5 bg-zinc-700"
      />

      {/* Compile error block */}
      {compileError && (
        <div>
          <p className="mb-1 text-xs font-medium text-red-400 uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Compile Error
          </p>
          <pre className="rounded-md bg-red-950/40 border border-red-500/20 px-3 py-2.5 text-xs font-mono text-red-300 whitespace-pre-wrap overflow-x-auto">
            {firstResult.compile_output.trim()}
          </pre>
        </div>
      )}

      {/* Test cases table */}
      {!compileError && results.length > 0 && (
        <div className="rounded-md border border-zinc-700/50 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-zinc-800/60 text-zinc-400">
                <th className="px-3 py-2 text-left font-medium w-8">#</th>
                <th className="px-3 py-2 text-left font-medium w-24">Status</th>
                <th className="px-3 py-2 text-left font-medium">Input</th>
                <th className="px-3 py-2 text-left font-medium">Expected</th>
                <th className="px-3 py-2 text-left font-medium">Got</th>
                <th className="px-3 py-2 text-left font-medium w-16">Time</th>
              </tr>
            </thead>
            <tbody>
              {results.map((tc, i) => {
                const isVisible = tc.is_sample !== false && i < 2;
                return (
                  <tr
                    key={i}
                    className={cn(
                      'border-t border-zinc-700/30',
                      tc.is_correct
                        ? 'border-l-2 border-l-green-500'
                        : 'border-l-2 border-l-red-500'
                    )}
                  >
                    <td className="px-3 py-2 text-zinc-400">{i + 1}</td>
                    <td className="px-3 py-2">
                      {tc.is_correct ? (
                        <span className="flex items-center gap-1 text-green-400 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Passed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400 font-medium">
                          <XCircle className="h-3.5 w-3.5" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-zinc-300">
                      {isVisible
                        ? truncate(String(tc.input ?? ''))
                        : <span className="text-zinc-500 italic">Hidden</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-zinc-300">
                      {isVisible
                        ? truncate(String(tc.expected_output ?? ''))
                        : <span className="text-zinc-500 italic">Hidden</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-zinc-300">
                      {tc.actual_output != null
                        ? truncate(tc.actual_output.trim())
                        : <span className="text-zinc-500">—</span>}
                    </td>
                    <td className="px-3 py-2 text-zinc-400">{tc.time ? `${tc.time}s` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function truncate(str, max = 40) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────

function OutputLoading({ type }) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-400">
      <Loader2 className="h-4 w-4 animate-spin" />
      {type === 'submit' ? 'Running test cases…' : 'Executing…'}
    </div>
  );
}

// ─── Public component ──────────────────────────────────────────────────────────

export function CodeOutput({ type, result, loading }) {
  if (!loading && !result) return null;

  return (
    <div className="border-t border-zinc-700/50 bg-zinc-950 px-4 py-3">
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {type === 'submit' ? 'Test Results' : 'Output'}
      </p>
      {loading ? (
        <OutputLoading type={type} />
      ) : type === 'run' ? (
        <RunOutput result={result} />
      ) : (
        <SubmitOutput result={result} />
      )}
    </div>
  );
}
