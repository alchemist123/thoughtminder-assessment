import { useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

function CopyCell({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex items-center gap-1">
      <span className="max-w-[180px] truncate text-xs text-muted-foreground">{text}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
        aria-label="Copy link"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}

export function PasscodeResultDialog({ open, onOpenChange, results = [] }) {
  const { toast } = useToast();

  const handleCopyCSV = () => {
    const header = 'Name,Email,Passcode,Access Link';
    const rows = results.map(
      (r) =>
        `"${r.candidate?.name ?? ''}","${r.candidate?.email ?? ''}","${r.passcode}","${r.access_link}"`
    );
    const csv = [header, ...rows].join('\n');

    navigator.clipboard
      .writeText(csv)
      .then(() => {
        toast({ title: 'Copied!', description: 'CSV copied to clipboard.' });
      })
      .catch(() => {
        toast({ title: 'Copy failed', variant: 'destructive' });
      });
  };

  const handleDownloadCSV = () => {
    const header = 'Name,Email,Passcode,Access Link';
    const rows = results.map(
      (r) =>
        `"${r.candidate?.name ?? ''}","${r.candidate?.email ?? ''}","${r.passcode}","${r.access_link}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'passcodes.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Exam Launched Successfully 🎉</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {results.length} candidate passcode{results.length !== 1 ? 's' : ''} generated.
            Share these access links with your candidates.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-32">Passcode</TableHead>
                <TableHead>Access Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r, i) => (
                <TableRow key={r.candidate?.id ?? i}>
                  <TableCell className="font-medium">
                    {r.candidate?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.candidate?.email ?? '—'}
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono tracking-wider">
                      {r.passcode}
                    </code>
                  </TableCell>
                  <TableCell>
                    <CopyCell text={r.access_link} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-row gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyCSV}>
              <Copy className="mr-2 h-4 w-4" />
              Copy All as CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          </div>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
