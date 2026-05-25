import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ClipboardList, AlertCircle, Clock, Monitor, ShieldAlert,
  CheckCircle2, ChevronRight, Eye, Wifi, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/axios';
import useExamSessionStore from '@/store/examSessionStore';
import { CameraPermissionGate } from '@/components/exam/CameraPermissionGate';

const SECTION_LABEL = {
  quantitative: 'Quantitative Aptitude',
  verbal: 'Verbal',
  technical: 'Technical',
  coding: 'Coding',
};

const RULES = [
  { icon: Monitor,     text: 'Do not switch tabs or open other applications during the exam. Each violation is recorded.' },
  { icon: Eye,         text: 'Your camera is active throughout the exam. Ensure your face is clearly visible at all times.' },
  { icon: Clock,       text: 'The timer starts immediately. The exam auto-submits when time runs out.' },
  { icon: Wifi,        text: 'Ensure a stable internet connection. Answers are saved continuously.' },
  { icon: ShieldAlert, text: 'Use of mobile phones, notes, or external help is strictly prohibited.' },
  { icon: CheckCircle2, text: 'Once submitted, you cannot re-enter or change your answers.' },
];

function classifyError(err) {
  const status = err?.response?.status;
  const msg    = err?.response?.data?.message ?? '';
  if (status === 404) return 'You are not assigned to this exam. Please contact your administrator.';
  if (status === 403) {
    if (msg.toLowerCase().includes('submitted')) return 'This exam has already been submitted and cannot be restarted.';
    if (msg.toLowerCase().includes('active'))    return 'This exam is not currently active. Please contact your administrator.';
    return msg || 'Access denied.';
  }
  if (status === 401) return 'Please log in to access the exam.';
  return msg || 'Something went wrong. Please try again.';
}

// ── Instructions screen ───────────────────────────────────────────────────────

function InstructionsScreen({ exam, onStart }) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ClipboardList className="h-6 w-6" />
        </div>
        <span className="text-lg font-semibold tracking-tight">ThoughtMinder Assessment</span>
      </div>

      <div className="w-full max-w-2xl space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">{exam.title}</CardTitle>
                <p className="mt-0.5 text-sm text-muted-foreground">Read all instructions carefully before you begin.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {exam.duration_minutes} min
                </Badge>
                {exam.sections?.map((s) => (
                  <Badge key={s} variant="secondary" className="capitalize text-xs">
                    {SECTION_LABEL[s] ?? s}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Exam Rules & Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {RULES.map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                <p className="text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-900/20">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <span className="font-medium">Proctored Exam:</span> Your session is monitored via camera. Any malpractice — including tab switching, multiple faces, or absence from camera — will be flagged and reported to the examiner.
          </p>
        </div>

        <Card>
          <CardContent className="pt-5 space-y-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-primary"
              />
              <span className="text-sm leading-relaxed">
                I have read and understood all the instructions above. I agree to complete this exam honestly and without any external assistance.
              </span>
            </label>
            <Button className="w-full" disabled={!acknowledged} onClick={onStart}>
              Start Exam
              <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Auto-start screen (renders after camera permission) ───────────────────────

function AutoStartScreen({ examId, onExamReady }) {
  const { initSession } = useExamSessionStore();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        const { data } = await api.post('/exam/start', { exam_id: examId });
        if (cancelled) return;
        const { candidateExam, exam, existingAnswers } = data.data;
        initSession(candidateExam, exam, existingAnswers ?? []);
        onExamReady(exam);
      } catch (err) {
        if (!cancelled) setError(classifyError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    start();
    return () => { cancelled = true; };
  }, [examId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ClipboardList className="h-6 w-6" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Preparing your exam…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <CardTitle className="text-lg">Cannot Access Exam</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">{error}</p>
            <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ExamAccessPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [examInfo, setExamInfo] = useState(null);

  const handleStartExam = () => {
    navigate(`/exam/${examId}/take`, { replace: true });
  };

  return (
    <CameraPermissionGate>
      {examInfo ? (
        <InstructionsScreen exam={examInfo} onStart={handleStartExam} />
      ) : (
        <AutoStartScreen examId={examId} onExamReady={setExamInfo} />
      )}
    </CameraPermissionGate>
  );
}
