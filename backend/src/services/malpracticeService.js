'use strict';
const { MalpracticeLog, CandidateExam, User } = require('../models');
const AppError = require('../utils/AppError');

// ── Log a single malpractice event ───────────────────────────────────────

const logEvent = async ({
  candidate_exam_id,
  candidate_id,
  exam_id,
  type,
  snapshot_base64,
  snapshot_mime,
  detected_faces,
  metadata,
}) => {
  const session = await CandidateExam.findByPk(candidate_exam_id);
  if (!session) throw new AppError('Candidate exam session not found', 404);
  if (session.status !== 'started') {
    throw new AppError('Malpractice events can only be logged for active sessions', 400);
  }

  const log = await MalpracticeLog.create({
    candidate_exam_id,
    candidate_id,
    exam_id,
    type,
    snapshot_base64: snapshot_base64 ?? null,
    snapshot_mime:   snapshot_mime   ?? 'image/jpeg',
    detected_faces:  detected_faces  ?? null,
    metadata:        metadata        ?? null,
  });

  return log;
};

// ── All logs for an exam, grouped by candidate session ───────────────────

const getLogsForExam = async (examId) => {
  const logs = await MalpracticeLog.findAll({
    where: { exam_id: examId },
    include: [
      {
        model:      User,
        as:         'candidate',
        attributes: ['id', 'name', 'email'],
      },
    ],
    attributes: { exclude: ['snapshot_base64'] }, // omit large blobs from overview
    order: [['occurred_at', 'ASC']],
  });

  // Group by candidate_exam_id
  const grouped = new Map();
  for (const log of logs) {
    const obj  = log.toJSON();
    const ceId = obj.candidate_exam_id;
    if (!grouped.has(ceId)) {
      grouped.set(ceId, {
        candidate_exam_id: ceId,
        candidate:         obj.candidate,
        logs:              [],
      });
    }
    const { candidate, ...logData } = obj;
    grouped.get(ceId).logs.push(logData);
  }

  return [...grouped.values()];
};

// ── All logs for a single candidate exam session (includes snapshots) ────

const getLogsForCandidateExam = async (candidateExamId) => {
  const logs = await MalpracticeLog.findAll({
    where: { candidate_exam_id: candidateExamId },
    order: [['occurred_at', 'ASC']],
  });

  return logs.map((l) => l.toJSON());
};

module.exports = { logEvent, getLogsForExam, getLogsForCandidateExam };
