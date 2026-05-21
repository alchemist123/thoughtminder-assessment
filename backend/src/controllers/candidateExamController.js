'use strict';
const { CandidateExam, Exam } = require('../models');
const examSessionService = require('../services/examSessionService');
const { successResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/exam/start
const startExam = asyncHandler(async (req, res) => {
  const { exam_id, passcode } = req.body;
  const result = await examSessionService.startExam(exam_id, passcode, req.user.id);
  const message = result.resumed ? 'Exam session resumed' : 'Exam started';
  return successResponse(res, result, message);
});

// POST /api/exam/answer
const submitAnswer = asyncHandler(async (req, res) => {
  const { candidate_exam_id, question_id, answer_text, selected_option } = req.body;
  const submission = await examSessionService.submitAnswer(
    candidate_exam_id,
    question_id,
    { answer_text, selected_option },
    req.user.id
  );
  return successResponse(res, submission, 'Answer saved');
});

// POST /api/exam/submit
const submitExam = asyncHandler(async (req, res) => {
  const { candidate_exam_id } = req.body;
  const result = await examSessionService.submitExam(candidate_exam_id, req.user.id);
  return successResponse(res, result, 'Exam submitted successfully');
});

// GET /api/exam/session/:candidate_exam_id
const getSession = asyncHandler(async (req, res) => {
  const session = await examSessionService.getSession(
    req.params.candidate_exam_id,
    req.user.id
  );
  return successResponse(res, session, 'Session retrieved');
});

// GET /api/exam/my-exams
const myExams = asyncHandler(async (req, res) => {
  const records = await CandidateExam.findAll({
    where: { candidate_id: req.user.id },
    include: [
      {
        model: Exam,
        as: 'exam',
        attributes: ['id', 'title', 'duration_minutes', 'sections', 'status'],
      },
    ],
    order: [['started_at', 'DESC NULLS LAST'], ['id', 'DESC']],
  });
  return successResponse(res, records, 'Exams retrieved');
});

module.exports = { startExam, submitAnswer, submitExam, getSession, myExams };
