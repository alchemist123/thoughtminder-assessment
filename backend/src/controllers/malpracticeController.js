'use strict';
const { CandidateExam } = require('../models');
const malpracticeService = require('../services/malpracticeService');
const { successResponse }  = require('../utils/response');
const AppError             = require('../utils/AppError');
const asyncHandler         = require('../utils/asyncHandler');

// POST /api/proctor/log
const logMalpractice = asyncHandler(async (req, res) => {
  const {
    candidate_exam_id,
    exam_id,
    type,
    snapshot_base64,
    snapshot_mime,
    detected_faces,
    metadata,
  } = req.body;

  // Ownership check — the session must belong to the authenticated candidate
  const session = await CandidateExam.findOne({
    where: { id: candidate_exam_id, candidate_id: req.user.id },
  });
  if (!session) throw new AppError('Session not found or access denied', 403);

  // Fire-and-forget is intentional here: we respond 201 immediately after
  // the DB insert rather than waiting on any downstream processing.
  const log = await malpracticeService.logEvent({
    candidate_exam_id,
    candidate_id: req.user.id,
    exam_id,
    type,
    snapshot_base64,
    snapshot_mime,
    detected_faces,
    metadata,
  });

  return successResponse(res, { id: log.id }, 'Event logged', 201);
});

// GET /api/admin/exams/:id/malpractice
const getExamMalpractice = asyncHandler(async (req, res) => {
  const grouped = await malpracticeService.getLogsForExam(req.params.id);
  return successResponse(res, grouped, 'Malpractice logs retrieved');
});

// GET /api/admin/candidate-exams/:candidateExamId/malpractice
const getCandidateExamMalpractice = asyncHandler(async (req, res) => {
  const logs = await malpracticeService.getLogsForCandidateExam(
    req.params.candidateExamId
  );
  return successResponse(res, logs, 'Malpractice logs retrieved');
});

module.exports = { logMalpractice, getExamMalpractice, getCandidateExamMalpractice };
