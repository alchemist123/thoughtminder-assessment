'use strict';
const { CandidateExam, Exam, Question, ExamQuestion, Submission } = require('../models');
const { getExamWithQuestions } = require('./examService');
const AppError = require('../utils/AppError');

// Strip correct_answer before sending exam data to the candidate. Correct answers
// must never be transmitted to the client — candidates could inspect network traffic.
const sanitizeForCandidate = (exam) => {
  if (!exam) return exam;

  const strip = (q) => {
    const copy = { ...q };
    delete copy.correct_answer;
    return copy;
  };

  const sanitized = { ...exam };

  if (Array.isArray(sanitized.examQuestions)) {
    sanitized.examQuestions = sanitized.examQuestions.map((eq) => ({
      ...eq,
      question: strip(eq.question),
    }));
  }

  if (sanitized.questionsBySection) {
    const cleaned = {};
    for (const [section, qs] of Object.entries(sanitized.questionsBySection)) {
      cleaned[section] = qs.map(strip);
    }
    sanitized.questionsBySection = cleaned;
  }

  return sanitized;
};

// ── Service functions ─────────────────────────────────────────────────────

// candidateId is the authenticated user's id — used to verify ownership of the passcode.
const startExam = async (examId, passcode, candidateId) => {
  const candidateExam = await CandidateExam.findOne({
    where: { exam_id: examId, passcode, candidate_id: candidateId },
  });
  if (!candidateExam) throw new AppError('Invalid exam, passcode, or access not granted', 404);

  if (candidateExam.status === 'submitted') {
    throw new AppError('This exam has already been submitted and cannot be restarted', 403);
  }

  const exam = await Exam.findByPk(examId);
  if (exam.status !== 'active') {
    throw new AppError('This exam is not currently active', 403);
  }

  const isResume = candidateExam.status === 'started';

  if (!isResume) {
    await candidateExam.update({ status: 'started', started_at: new Date() });
  }

  const examData = sanitizeForCandidate(await getExamWithQuestions(examId));

  const existingAnswers = isResume
    ? await Submission.findAll({ where: { candidate_exam_id: candidateExam.id } })
    : [];

  return {
    candidateExam: candidateExam.toJSON(),
    exam: examData,
    existingAnswers,
    resumed: isResume,
  };
};

const submitAnswer = async (candidateExamId, questionId, { answer_text, selected_option } = {}, candidateId) => {
  // Ownership check — candidate can only write to their own session
  const candidateExam = await CandidateExam.findOne({
    where: { id: candidateExamId, candidate_id: candidateId },
  });
  if (!candidateExam) throw new AppError('Exam session not found or not accessible', 404);
  if (candidateExam.status !== 'started') {
    throw new AppError('Cannot save answers: exam is not currently in progress', 400);
  }

  const question = await Question.findByPk(questionId);
  if (!question) throw new AppError('Question not found', 404);

  const answerData = {};

  if (question.type === 'mcq') {
    answerData.selected_option = selected_option ?? null;
    // Only score immediately for MCQ — other types require manual/automated review
    answerData.is_correct =
      typeof selected_option === 'string' ? selected_option === question.correct_answer : null;
  } else if (question.type === 'written') {
    answerData.answer_text = answer_text ?? null;
    answerData.is_correct  = null; // manual review
  } else if (question.type === 'coding') {
    answerData.answer_text = answer_text ?? null;
    answerData.is_correct  = null; // set by code-execution pipeline (Judge0)
  }

  const [submission, created] = await Submission.findOrCreate({
    where:    { candidate_exam_id: candidateExamId, question_id: questionId },
    defaults: { candidate_exam_id: candidateExamId, question_id: questionId, ...answerData },
  });

  if (!created) {
    await submission.update(answerData);
    await submission.reload();
  }

  return submission;
};

const submitExam = async (candidateExamId, candidateId) => {
  const candidateExam = await CandidateExam.findOne({
    where: { id: candidateExamId, candidate_id: candidateId },
  });
  if (!candidateExam) throw new AppError('Exam session not found or not accessible', 404);
  if (candidateExam.status !== 'started') {
    throw new AppError('Cannot submit: exam is not currently in progress', 400);
  }

  // Fetch all MCQ question ids for this exam
  const mcqRows = await ExamQuestion.findAll({
    where: { exam_id: candidateExam.exam_id },
    include: [{ model: Question, as: 'question', where: { type: 'mcq' }, required: true }],
    attributes: ['question_id'],
  });
  const totalMCQ = mcqRows.length;

  let score = 0;
  if (totalMCQ > 0) {
    const mcqIds      = mcqRows.map((r) => r.question_id);
    const correctCount = await Submission.count({
      where: { candidate_exam_id: candidateExamId, question_id: mcqIds, is_correct: true },
    });
    score = Number(((correctCount / totalMCQ) * 100).toFixed(2));
  }

  const submitted_at = new Date();
  await candidateExam.update({ status: 'submitted', submitted_at, score });

  // Mark the exam as completed if all assigned candidates have now submitted
  const [totalAssigned, totalSubmitted] = await Promise.all([
    CandidateExam.count({ where: { exam_id: candidateExam.exam_id } }),
    CandidateExam.count({ where: { exam_id: candidateExam.exam_id, status: 'submitted' } }),
  ]);
  if (totalAssigned > 0 && totalAssigned === totalSubmitted) {
    await Exam.update({ status: 'completed' }, { where: { id: candidateExam.exam_id } });
  }

  return { score, submitted_at };
};

const getSession = async (candidateExamId, candidateId) => {
  const candidateExam = await CandidateExam.findOne({
    where: { id: candidateExamId, candidate_id: candidateId },
  });
  if (!candidateExam) throw new AppError('Session not found or not accessible', 404);

  const exam        = sanitizeForCandidate(await getExamWithQuestions(candidateExam.exam_id));
  const submissions = await Submission.findAll({ where: { candidate_exam_id: candidateExamId } });

  return { candidateExam, exam, submissions };
};

module.exports = { startExam, submitAnswer, submitExam, getSession };
