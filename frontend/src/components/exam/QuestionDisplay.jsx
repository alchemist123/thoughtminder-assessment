import { useState, useEffect, useRef, useCallback } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// ─── MCQ ─────────────────────────────────────────────────────────────────────

function MCQQuestion({ question, answer, onAnswer }) {
  const selected = answer?.selected_option ?? null;

  const handleSelect = (option) => {
    onAnswer({ selected_option: option });
  };

  const options = Array.isArray(question.options) ? question.options : [];

  return (
    <div className="space-y-6">
      <p className="text-base leading-relaxed">{question.question_text}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option, idx) => {
          const isSelected = selected === option;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(option)}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border bg-background'
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {OPTION_LETTERS[idx] ?? idx + 1}
              </span>
              <span className="text-sm leading-snug">{option}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <p className="flex items-center gap-1.5 text-xs text-green-600">
          <Check className="h-3 w-3" />
          Answer selected
        </p>
      )}
    </div>
  );
}

// ─── Written ──────────────────────────────────────────────────────────────────

function WrittenQuestion({ question, answer, onAnswer }) {
  const [localText, setLocalText] = useState(answer?.answer_text ?? '');
  const [savedAt, setSavedAt] = useState(answer?.is_saved ? Date.now() : null);
  const textareaRef = useRef(null);
  const lastSavedText = useRef(answer?.answer_text ?? '');

  // Keep in sync when external answer changes (e.g. on resume)
  useEffect(() => {
    const external = answer?.answer_text ?? '';
    if (external !== localText) {
      setLocalText(external);
      lastSavedText.current = external;
    }
  }, [question.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [localText]);

  const doSave = useCallback(() => {
    if (localText === lastSavedText.current) return;
    lastSavedText.current = localText;
    onAnswer({ answer_text: localText });
    setSavedAt(Date.now());
  }, [localText, onAnswer]);

  // Save on blur
  const handleBlur = () => doSave();

  // Auto-save every 30 seconds if dirty
  useEffect(() => {
    const interval = setInterval(() => {
      if (localText !== lastSavedText.current) {
        doSave();
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [doSave]);

  // Show "Saved ✓" for 3 seconds after save
  const showSaved = savedAt != null && answer?.is_saved;

  return (
    <div className="space-y-4">
      <p className="text-base leading-relaxed">{question.question_text}</p>

      <div className="space-y-1.5">
        <textarea
          ref={textareaRef}
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          onBlur={handleBlur}
          rows={6}
          placeholder="Write your answer here…"
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-h-[9rem]"
          style={{ height: 'auto' }}
        />
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs text-muted-foreground">
            {localText.length} characters
          </span>
          {showSaved && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3 w-3" />
              Saved
            </span>
          )}
          {localText !== lastSavedText.current && (
            <span className="text-xs text-amber-500">Unsaved changes</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Exported QuestionDisplay ─────────────────────────────────────────────────

export function QuestionDisplay({ question, answer, onAnswer }) {
  if (!question) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Select a question from the sidebar.
      </div>
    );
  }

  if (question.type === 'mcq') {
    return <MCQQuestion question={question} answer={answer} onAnswer={onAnswer} />;
  }

  if (question.type === 'written') {
    return <WrittenQuestion question={question} answer={answer} onAnswer={onAnswer} />;
  }

  return (
    <p className="text-muted-foreground text-sm">
      Question type &ldquo;{question.type}&rdquo; is not supported in this view.
    </p>
  );
}
