'use strict';
const { CandidateExam, Question, Submission } = require('../models');
const judge0Service = require('../services/judge0Service');
const { successResponse } = require('../utils/response');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const DEFAULT_QUESTION_MAX_SCORE = 10;

// ── Shared ownership + session guard ─────────────────────────────────────────
const resolveSession = async (candidateExamId, candidateId, { requireStarted = false } = {}) => {
  const session = await CandidateExam.findOne({
    where: { id: candidateExamId, candidate_id: candidateId },
  });
  if (!session) throw new AppError('Exam session not found or not accessible', 404);

  if (requireStarted && session.status !== 'started') {
    throw new AppError('Cannot submit code: exam is not currently in progress', 400);
  }
  return session;
};

// ── POST /api/code/run ────────────────────────────────────────────────────────
// Runs code against sample_input only — result is NOT saved.
const run = asyncHandler(async (req, res) => {
  const { source_code, language, sample_input, candidate_exam_id } = req.body;

  await resolveSession(candidate_exam_id, req.user.id);

  const result = await judge0Service.runSampleCode({ source_code, language, sample_input });

  return successResponse(res, {
    stdout:         result.stdout,
    stderr:         result.stderr,
    compile_output: result.compile_output,
    status:         result.status,
    status_id:      result.status_id,
    time:           result.time,
  }, 'Code executed');
});

// ── POST /api/code/submit ─────────────────────────────────────────────────────
// Runs code against all test cases, scores the result, and persists the submission.
const submit = asyncHandler(async (req, res) => {
  const { source_code, language, candidate_exam_id, question_id } = req.body;

  await resolveSession(candidate_exam_id, req.user.id, { requireStarted: true });

  const question = await Question.findByPk(question_id);
  if (!question) throw new AppError('Question not found', 404);

  if (!Array.isArray(question.test_cases) || question.test_cases.length === 0) {
    throw new AppError('This question has no test cases configured', 400);
  }

  const results      = await judge0Service.runTestCases({ source_code, language, test_cases: question.test_cases });
  const passed_cases = results.filter((r) => r.is_correct).length;
  const total_cases  = results.length;
  // 3-tier: all pass → 10 pts, partial → 5 pts, none → 0 pts
  const score = passed_cases === total_cases
    ? DEFAULT_QUESTION_MAX_SCORE
    : passed_cases > 0
      ? DEFAULT_QUESTION_MAX_SCORE / 2
      : 0;

  const is_correct = passed_cases === total_cases;

  const code_submission = { language, source_code, results, passed_cases, total_cases };

  // Upsert: update existing submission if the candidate re-submits
  const [submission, created] = await Submission.findOrCreate({
    where:    { candidate_exam_id, question_id },
    defaults: { candidate_exam_id, question_id, code_submission, is_correct, score },
  });

  if (!created) {
    await submission.update({ code_submission, is_correct, score });
  }

  return successResponse(res, { results, passed_cases, total_cases, score }, 'Code submitted and evaluated');
});

module.exports = { run, submit };