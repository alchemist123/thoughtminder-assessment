'use strict';
const { CandidateExam, Exam, User, Submission, Question, ExamQuestion } = require('../models');
const AppError = require('../utils/AppError');

// ── Grade a single written answer and recalculate session score ───────────────

const gradeWrittenAnswer = async (candidateExamId, questionId, isCorrect) => {
  const session = await CandidateExam.findByPk(candidateExamId);
  if (!session) throw new AppError('Candidate exam session not found', 404);

  const submission = await Submission.findOne({
    where: { candidate_exam_id: candidateExamId, question_id: questionId },
    include: [{ model: Question, as: 'question', attributes: ['type'] }],
  });
  if (!submission) throw new AppError('Submission not found', 404);
  if (submission.question.type !== 'written') {
    throw new AppError('Only written answers can be graded manually', 400);
  }

  await submission.update({ is_correct: isCorrect });

  // Recalculate score: (MCQ correct + Written correct) / (MCQ total + Written total) * 100
  const scoredTypes = ['mcq', 'written'];
  const allScoredQuestions = await ExamQuestion.findAll({
    where: { exam_id: session.exam_id },
    include: [{
      model: Question,
      as: 'question',
      attributes: ['id', 'type'],
      where: { type: scoredTypes },
      required: true,
    }],
  });
  const scoredIds = allScoredQuestions.map((eq) => eq.question_id);

  if (scoredIds.length > 0) {
    const correctCount = await Submission.count({
      where: { candidate_exam_id: candidateExamId, question_id: scoredIds, is_correct: true },
    });
    const newScore = Number(((correctCount / scoredIds.length) * 100).toFixed(2));
    await session.update({ score: newScore });
    return { is_correct: isCorrect, new_score: newScore };
  }

  return { is_correct: isCorrect, new_score: session.score };
};

const getCandidateSubmissions = async (candidateExamId) => {
  // Load session with its exam and candidate
  const session = await CandidateExam.findByPk(candidateExamId, {
    include: [
      {
        model:      Exam,
        as:         'exam',
        attributes: ['id', 'title', 'duration_minutes', 'sections'],
      },
      {
        model:      User,
        as:         'candidate',
        attributes: ['id', 'name', 'email', 'stream', 'batch', 'sgpa'],
      },
    ],
  });
  if (!session) throw new AppError('Candidate exam session not found', 404);

  const sessionObj = session.toJSON();

  // Load all answers, each joined with its full question
  const rawSubmissions = await Submission.findAll({
    where: { candidate_exam_id: candidateExamId },
    include: [
      {
        model:      Question,
        as:         'question',
        attributes: [
          'id', 'section', 'type', 'difficulty',
          'question_text', 'options', 'correct_answer', 'test_cases',
        ],
      },
    ],
    order: [
      [{ model: Question, as: 'question' }, 'section', 'ASC'],
    ],
  });

  // Total question count for the exam (includes unanswered questions)
  const totalQuestions = await ExamQuestion.count({
    where: { exam_id: sessionObj.exam_id },
  });

  // Build structured array and accumulate summary counters
  let mcqCorrect = 0;
  let mcqTotal   = 0;
  let codingScore = 0;

  const submissions = rawSubmissions
    .map((sub) => sub.toJSON())
    .filter((s) => s.question != null)
    .map((s) => {
      const q = s.question;

      // Back-fill is_correct for MCQ rows where it was never stored
      let isCorrect = s.is_correct;
      if (q.type === 'mcq' && isCorrect == null && s.selected_option != null) {
        isCorrect = s.selected_option === q.correct_answer;
      }

      if (q.type === 'mcq') {
        mcqTotal++;
        if (isCorrect === true) mcqCorrect++;
      }

      if (q.type === 'coding' && s.score != null) {
        codingScore += parseFloat(s.score);
      }

      return {
        question: {
          id:            q.id,
          section:       q.section,
          type:          q.type,
          difficulty:    q.difficulty,
          question_text: q.question_text,
          options:       q.options       ?? null,
          correct_answer: q.correct_answer ?? null,
          test_cases:    q.test_cases    ?? null,
        },
        answer: {
          selected_option: s.selected_option  ?? null,
          answer_text:     s.answer_text      ?? null,
          code_submission: s.code_submission  ?? null,
          is_correct:      isCorrect          ?? null,
          score:           s.score != null ? parseFloat(s.score) : null,
        },
      };
    });

  const finalScore = sessionObj.score != null ? parseFloat(sessionObj.score) : null;

  return {
    candidateExam: {
      id:           sessionObj.id,
      status:       sessionObj.status,
      score:        finalScore,
      started_at:   sessionObj.started_at,
      submitted_at: sessionObj.submitted_at,
    },
    candidate: {
      id:     sessionObj.candidate.id,
      name:   sessionObj.candidate.name,
      email:  sessionObj.candidate.email,
      stream: sessionObj.candidate.stream,
      batch:  sessionObj.candidate.batch,
      sgpa:   sessionObj.candidate.sgpa,
    },
    exam: {
      id:               sessionObj.exam.id,
      title:            sessionObj.exam.title,
      duration_minutes: sessionObj.exam.duration_minutes,
      sections:         sessionObj.exam.sections,
    },
    submissions,
    summary: {
      total_questions: totalQuestions,
      answered:        submissions.length,
      mcq_correct:     mcqCorrect,
      mcq_total:       mcqTotal,
      coding_score:    parseFloat(codingScore.toFixed(2)),
      final_score:     finalScore,
    },
  };
};

module.exports = { getCandidateSubmissions, gradeWrittenAnswer };
