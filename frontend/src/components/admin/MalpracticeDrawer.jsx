import { useEffect, useState } from 'react';
import { AlertTriangle, Camera, Eye, EyeOff, Users, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getMalpracticeForCandidate } from '@/services/proctorService';

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_META = {
  tab_switch:      { label: 'Tab Switch Detected',    color: 'bg-amber-100 text-amber-800',  icon: AlertTriangle },
  multiple_faces:  { label: 'Multiple Faces Detected', color: 'bg-red-100 text-red-800',      icon: Users },
  no_face:         { label: 'No Face Detected',         color: 'bg-orange-100 text-orange-800', icon: EyeOff },
  camera_blocked:  { label: 'Camera Blocked',           color: 'bg-muted text-muted-foreground', icon: Camera },
};

function fmtTimestamp(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ── Snapshot full-screen modal ────────────────────────────────────────────────

function SnapshotModal({ open, onOpenChange, log }) {
  if (!log) return null;
  const src = `data:${log.snapshot_mime ?? 'image/jpeg'};base64,${log.snapshot_base64}`;
  const meta = TYPE_META[log.type] ?? {};
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {meta.label ?? log.type} — {fmtTimestamp(log.occurred_at)}
          </DialogTitle>
        </DialogHeader>
        <img
          src={src}
          alt="Malpractice snapshot"
          className="w-full rounded-md object-contain"
          style={{ maxHeight: '70vh' }}
        />
      </DialogContent>
    </Dialog>
  );
}

// ── Incident card ─────────────────────────────────────────────────────────────

function IncidentCard({ log, onViewSnapshot }) {
  const meta = TYPE_META[log.type] ?? {
    label: log.type,
    color: 'bg-muted text-muted-foreground',
    icon: AlertTriangle,
  };
  const Icon = meta.icon;
  const hasSnapshot = Boolean(log.snapshot_base64);

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
            meta.color
          )}
        >
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">
          {fmtTimestamp(log.occurred_at)}
        </span>
      </div>

      {log.detected_faces != null && (
        <p className="text-xs text-muted-foreground">
          Faces detected: {log.detected_faces}
        </p>
      )}

      {hasSnapshot ? (
        <button
          type="button"
          className="block"
          onClick={() => onViewSnapshot(log)}
        >
          <img
            src={`data:${log.snapshot_mime ?? 'image/jpeg'};base64,${log.snapshot_base64}`}
            alt="snapshot"
            className="w-[200px] rounded-md border object-cover cursor-pointer hover:opacity-90 transition-opacity"
          />
        </button>
      ) : (
        <p className="text-xs text-muted-foreground italic">No snapshot captured</p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MalpracticeDrawer({ open, onOpenChange, candidateExamId, candidateName }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snapshotModal, setSnapshotModal] = useState({ open: false, log: null });

  useEffect(() => {
    if (!open || !candidateExamId) return;
    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      setLogs([]);
      try {
        const data = await getMalpracticeForCandidate(candidateExamId);
        if (!cancelled) setLogs(data?.logs ?? []);
      } catch {
        // silently ignore — empty state shown
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [open, candidateExamId]);

  // ── Summary breakdown ────────────────────────────────────────────────────
  const counts = logs.reduce((acc, l) => {
    acc[l.type] = (acc[l.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex flex-col overflow-hidden p-0"
          style={{ width: '600px', maxWidth: '100vw' }}
        >
          <SheetHeader className="border-b px-6 py-4 shrink-0">
            <SheetTitle className="text-base">
              {candidateName ? `${candidateName} — ` : ''}Malpractice Report
            </SheetTitle>
          </SheetHeader>

          {/* Summary bar */}
          <div className="border-b bg-muted/40 px-6 py-3 shrink-0">
            {loading ? (
              <Skeleton className="h-5 w-48" />
            ) : (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-medium">{logs.length} incident{logs.length !== 1 ? 's' : ''}</span>
                {Object.entries(counts).map(([type, n]) => {
                  const meta = TYPE_META[type];
                  if (!meta) return null;
                  return (
                    <span
                      key={type}
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        meta.color
                      )}
                    >
                      {meta.label}: {n}
                    </span>
                  );
                })}
                {logs.length === 0 && (
                  <span className="text-muted-foreground">No incidents recorded</span>
                )}
              </div>
            )}
          </div>

          {/* Incident list */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <Eye className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm">No malpractice incidents recorded for this candidate.</p>
              </div>
            ) : (
              logs.map((log) => (
                <IncidentCard
                  key={log.id}
                  log={log}
                  onViewSnapshot={(l) => setSnapshotModal({ open: true, log: l })}
                />
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <SnapshotModal
        open={snapshotModal.open}
        onOpenChange={(o) => setSnapshotModal((s) => ({ ...s, open: o }))}
        log={snapshotModal.log}
      />
    </>
  );
}
