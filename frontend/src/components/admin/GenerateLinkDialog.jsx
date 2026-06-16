import { useState, useEffect } from 'react';
import { Copy, Check, Link2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { generateRegistrationLink } from '@/services/adminService';

export function GenerateLinkDialog() {
  const [open, setOpen] = useState(false);
  const [linkData, setLinkData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLinkData(null);
    setError(null);
    setCopied(false);
    setGenerating(true);
    generateRegistrationLink()
      .then(setLinkData)
      .catch(() => setError('Failed to generate link. Please try again.'))
      .finally(() => setGenerating(false));
  }, [open]);

  const handleCopy = async () => {
    if (!linkData?.url) return;
    try {
      await navigator.clipboard.writeText(linkData.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for environments without clipboard API
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Link2 className="mr-2 h-4 w-4" />
        Generate Registration Link
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registration Link</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {generating && (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {linkData && (
              <>
                <div className="flex gap-2">
                  <Input
                    value={linkData.url}
                    readOnly
                    className="font-mono text-xs"
                    onFocus={(e) => e.target.select()}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    aria-label="Copy link"
                  >
                    {copied
                      ? <Check className="h-4 w-4 text-green-600" />
                      : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                {copied && (
                  <p className="text-xs text-green-600">Copied to clipboard!</p>
                )}

                <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                  <p>
                    This link expires in <strong>20 minutes</strong>.
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
