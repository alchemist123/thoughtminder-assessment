'use strict';
const { CandidateExam, Exam, User, Submission, Question, ExamQuestion } = require('../models');
const AppError = require('../utils/AppError');

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

module.exports = { getCandidateSubmissions };
