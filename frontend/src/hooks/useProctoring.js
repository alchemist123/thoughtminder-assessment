import { useRef, useState, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import api from '@/lib/axios';
import useExamSessionStore from '@/store/examSessionStore';

const MODELS_URL = '/models';
const DETECT_INTERVAL_MS = 5000;

let modelsLoaded = false;

async function ensureModels() {
  if (modelsLoaded) return;
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
  modelsLoaded = true;
}

export function useProctoring({ candidateExamId, examId }) {
  const videoRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [violationCount, setViolationCount] = useState(0);

  const intervalRef = useRef(null);
  const lastTabSwitchRef = useRef(0);

  // ── Snapshot ───────────────────────────────────────────────────────────────

  const captureSnapshot = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width  = video.videoWidth  || 320;
      canvas.height = video.videoHeight || 240;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      return { base64: dataUrl.split(',')[1], mime: 'image/jpeg' };
    } catch {
      return null;
    }
  }, []);

  // ── Fire-and-forget log ────────────────────────────────────────────────────

  const logTabSwitch = useCallback((snapshot) => {
    const now = Date.now();
    if (now - lastTabSwitchRef.current < 500) return; // deduplicate blur + visibilitychange
    lastTabSwitchRef.current = now;
    const payload = {
      candidate_exam_id: candidateExamId,
      exam_id:           examId,
      type:              'tab_switch',
    };
    if (snapshot) {
      payload.snapshot_base64 = snapshot.base64;
      payload.snapshot_mime   = snapshot.mime;
    }
    api.post('/proctor/log', payload).catch(() => {});
    setViolationCount((n) => n + 1);
  }, [candidateExamId, examId]);

  const sendLog = useCallback((type, snapshotData = null, extraMeta = null) => {
    const payload = {
      candidate_exam_id: candidateExamId,
      exam_id:           examId,
      type,
    };
    if (snapshotData) {
      payload.snapshot_base64 = snapshotData.base64;
      payload.snapshot_mime   = snapshotData.mime;
    }
    if (extraMeta) payload.metadata = extraMeta;

    api.post('/proctor/log', payload).catch(() => {/* fire-and-forget */});
    setViolationCount((n) => n + 1);
  }, [candidateExamId, examId]);

  // ── Face detection loop ────────────────────────────────────────────────────

  const runDetection = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    try {
      const detections = await faceapi.detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions()
      );
      const count = detections.length;
      const snapshot = captureSnapshot();

      if (count === 0) {
        sendLog('no_face', snapshot, { detected_faces: 0 });
      } else if (count >= 2) {
        sendLog('multiple_faces', snapshot, { detected_faces: count });
      }
    } catch {
      /* tolerate detection errors silently */
    }
  }, [captureSnapshot, sendLog]);

  // ── Initialise camera + models ─────────────────────────────────────────────

  useEffect(() => {
    let stream = null;
    let cancelled = false;

    const init = async () => {
      try {
        // Re-use stream from store if camera permission already granted
        const stored = useExamSessionStore.getState().mediaStream;
        if (stored && stored.active) {
          stream = stored;
        } else {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          useExamSessionStore.getState().setMediaStream(stream);
        }

        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        await ensureModels();

        if (cancelled) return;

        setCameraReady(true);
        setIsMonitoring(true);

        intervalRef.current = setInterval(runDetection, DETECT_INTERVAL_MS);
      } catch (err) {
        if (!cancelled) setCameraError(err.name ?? 'CameraError');
      }
    };

    init();

    return () => {
      cancelled = true;
      clearInterval(intervalRef.current);
    };
  }, [runDetection]);

  // ── Tab-switch detection ───────────────────────────────────────────────────
  // visibilitychange is the most reliable cross-browser signal for actual tab
  // switches. We also listen to window.blur for app-switches (e.g. alt-tab),
  // but deduplicate within 500 ms so only one event is logged per focus loss.

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        logTabSwitch(captureSnapshot());
      }
    };
    const onBlur = () => logTabSwitch(captureSnapshot());

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
    };
  }, [logTabSwitch, captureSnapshot]);

  return { videoRef, cameraReady, cameraError, isMonitoring, violationCount, sendLog, logTabSwitch, captureSnapshot };
}
