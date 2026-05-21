'use strict';
const { CandidateExam, Exam, User, sequelize } = require('../models');
const examService             = require('../services/examService');
const submissionReviewService = require('../services/submissionReviewService');
const { successResponse }     = require('../utils/response');
const AppError                = require('../utils/AppError');
const asyncHandler            = require('../utils/asyncHandler');

// POST /api/admin/exams
const createExam = asyncHandler(async (req, res) => {
  const exam = await examService.createExam(req.body);
  return successResponse(res, exam, 'Exam created', 201);
});

// GET /api/admin/exams
const listExams = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;
  const result = await examService.listExams({ status, page, limit });
  return successResponse(res, result, 'Exams retrieved');
});

// GET /api/admin/exams/:id
const getExam = asyncHandler(async (req, res) => {
  const exam = await examService.getExamWithCandidates(req.params.id);
  return successResponse(res, exam, 'Exam retrieved');
});

// PUT /api/admin/exams/:id
const updateExam = asyncHandler(async (req, res) => {
  const exam = await examService.updateExam(req.params.id, req.body);
  return successResponse(res, exam, 'Exam updated');
});

// POST /api/admin/exams/:id/launch
const launchExam = asyncHandler(async (req, res) => {
  const result = await examService.launchExam(req.params.id, req.body.candidate_ids);
  return successResponse(res, result, 'Exam launched and candidate sessions created');
});

// GET /api/admin/exams/:id/results
const getResults = asyncHandler(async (req, res) => {
  const exam = await Exam.findByPk(req.params.id);
  if (!exam) throw new AppError('Exam not found', 404);

  const sessions = await CandidateExam.findAll({
    where: { exam_id: req.params.id },
    include: [
      {
        model: User,
        as: 'candidate',
        attributes: ['id', 'name', 'email', 'stream', 'batch'],
      },
    ],
    order: [[sequelize.literal('score'), 'DESC NULLS LAST']],
  });

  const results = sessions.map((s) => {
    const obj = s.toJSON();
    obj.time_taken_minutes =
      obj.started_at && obj.submitted_at
        ? Math.round((new Date(obj.submitted_at) - new Date(obj.started_at)) / 60000)
        : null;
    return obj;
  });

  return successResponse(res, { exam, results }, 'Results retrieved');
});

// DELETE /api/admin/exams/:id  (soft delete)
const deleteExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findByPk(req.params.id);
  if (!exam) throw new AppError('Exam not found', 404);
  await exam.destroy();
  return successResponse(res, null, 'Exam deleted');
});

// GET /api/admin/candidate-exams/:candidateExamId/review
const reviewCandidateExam = asyncHandler(async (req, res) => {
  // Fast pre-check before loading all submission data
  const session = await CandidateExam.findByPk(req.params.candidateExamId, {
    attributes: ['status'],
  });
  if (!session) throw new AppError('Candidate exam session not found', 404);
  if (session.status !== 'submitted') {
    throw new AppError('Exam not yet submitted', 403);
  }

  const review = await submissionReviewService.getCandidateSubmissions(
    req.params.candidateExamId
  );
  return successResponse(res, review, 'Submission review retrieved');
});

module.exports = {
  createExam,
  listExams,
  getExam,
  updateExam,
  launchExam,
  getResults,
  deleteExam,
  reviewCandidateExam,
};
