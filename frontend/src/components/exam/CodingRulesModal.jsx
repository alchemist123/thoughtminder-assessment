import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Terminal, BookOpen, Play, ListChecks, AlertTriangle, Send } from 'lucide-react';

const SESSION_KEY = 'coding-rules-seen';

const RULES = [
  {
    icon: BookOpen,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    title: 'Read the problem carefully',
    body: 'The left panel shows the problem description, sample input/output, and example test cases. Understand what you need to output before writing code.',
  },
  {
    icon: Terminal,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    title: 'Do not modify the input-reading code',
    body: 'The boilerplate already reads the input from stdin for you. Only write your solution logic inside the function body — do not change how input is read.',
  },
  {
    icon: Play,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    title: 'Run tests with the Run button',
    body: 'Click Run (or press Ctrl+Enter) to execute your code against the sample input. Fix any compile or runtime errors before moving on.',
  },
  {
    icon: ListChecks,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    title: 'Submit with Run Test Cases',
    body: '"Run Test Cases" becomes available once your code runs without errors. It evaluates your code against all hidden test cases and records your score.',
  },
  {
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    title: 'Output format matters',
    body: 'Print only the required answer — no extra spaces, labels, or debug output. Your output is compared exactly with the expected output.',
  },
  {
    icon: Send,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    title: 'Run Test Cases before submitting the exam',
    body: 'You must click "Run Test Cases" for every coding question before you can submit the exam. The Submit button will be blocked until all coding questions have been evaluated.',
  },
];

export function CodingRulesModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setOpen(false);

    // When the student dismisses this modal with Enter or Space, Radix
    // restores focus to the element that was active before the dialog opened
    // (often the Submit button).  The keyup for that same keystroke then fires
    // on the restored-focus element, triggering an accidental submission.
    //
    // Fix: intercept and discard the next Enter/Space keyup at the window
    // capture phase, before it reaches any button.  The 500 ms timeout removes
    // the guard if no relevant keyup arrives (e.g. the student used a mouse).
    const suppressKeyup = (ev) => {
      if (ev.key === ' ' || ev.key === 'Enter') {
        ev.stopImmediatePropagation();
        window.removeEventListener('keyup', suppressKeyup, true);
      }
    };
    window.addEventListener('keyup', suppressKeyup, true);
    setTimeout(() => window.removeEventListener('keyup', suppressKeyup, true), 500);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Terminal className="h-4 w-4 text-blue-400" />
            Coding Section — How it works
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {RULES.map(({ icon: Icon, color, bg, title, body }) => (
            <div key={title} className="flex gap-3">
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${bg}`}>
                <Icon className={`h-3.5 w-3.5 ${color}`} />
              </span>
              <div>
                <p className="text-sm font-medium leading-snug">{title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" className="w-full" onClick={handleClose}>
            Got it — Start Coding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
