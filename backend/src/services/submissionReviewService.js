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

  // Recalculate unified score: MCQ + written + coding all contribute equally
  const allExamQuestionsRaw = await ExamQuestion.findAll({
    where: { exam_id: session.exam_id },
    include: [{ model: Question, as: 'question', attributes: ['id', 'type'], required: true }],
  });
  const allExamQuestions = allExamQuestionsRaw.map((eq) => eq.toJSON());
  const totalQuestions   = allExamQuestions.length;

  if (totalQuestions > 0) {
    const mcqWrittenIds = allExamQuestions
      .filter((eq) => ['mcq', 'written'].includes(eq.question?.type))
      .map((eq) => eq.question_id);
    const codingIds = allExamQuestions
      .filter((eq) => eq.question?.type === 'coding')
      .map((eq) => eq.question_id);

    let totalCorrect = 0;

    if (mcqWrittenIds.length > 0) {
      totalCorrect += await Submission.count({
        where: { candidate_exam_id: candidateExamId, question_id: mcqWrittenIds, is_correct: true },
      });
    }

    if (codingIds.length > 0) {
      const codingSubs = await Submission.findAll({
        where: { candidate_exam_id: candidateExamId, question_id: codingIds },
        attributes: ['score'],
      });
      totalCorrect += codingSubs.reduce(
        (sum, s) => sum + (s.score != null ? parseFloat(s.score) / 10 : 0),
        0
      );
    }

    const newScore = Number(((totalCorrect / totalQuestions) * 100).toFixed(2));
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

  // Total coding questions in exam (for denominator in display)
  const totalCodingQuestions = await ExamQuestion.count({
    where: { exam_id: sessionObj.exam_id },
    include: [{ model: Question, as: 'question', where: { type: 'coding' }, required: true }],
  });

  // Build structured array and accumulate summary counters
  let mcqCorrect       = 0;
  let mcqTotal         = 0;
  let writtenCorrect   = 0;
  let codingFullPass   = 0;    // all test cases passed (score = 10)
  let codingPartial    = 0;    // some test cases passed (score = 5)
  let codingNormalized = 0;    // 0–1 per question — for score formula

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

      if (q.type === 'written') {
        if (isCorrect === true) writtenCorrect++;
      }

      if (q.type === 'coding' && s.score != null) {
        const pts = parseFloat(s.score);
        codingNormalized += pts / 10;
        if (pts >= 10) codingFullPass++;
        else if (pts > 0) codingPartial++;
      }

      return {
        question: {
          id:            q.id,
          section:       q.section,
          type:          q.type,
          difficulty:    q.difficulty,
          question_text: q.question_text,
          options:       q.options        ?? null,
          correct_answer: q.correct_answer ?? null,
          test_cases:    q.test_cases     ?? null,
        },
        answer: {
          selected_option: s.selected_option ?? null,
          answer_text:     s.answer_text     ?? null,
          code_submission: s.code_submission ?? null,
          is_correct:      isCorrect         ?? null,
          score:           s.score != null ? parseFloat(s.score) : null,
        },
      };
    });

  // Compute accurate score from submissions (fixes stale DB values from old formula)
  const computedScore = totalQuestions > 0
    ? Number(((mcqCorrect + writtenCorrect + codingNormalized) / totalQuestions * 100).toFixed(2))
    : null;

  // Persist if the stored score is out of date
  const storedScore = sessionObj.score != null ? parseFloat(sessionObj.score) : null;
  if (computedScore !== null && computedScore !== storedScore) {
    await session.update({ score: computedScore });
  }

  const finalScore = computedScore ?? storedScore;

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
      total_questions:       totalQuestions,
      answered:              submissions.length,
      mcq_correct:           mcqCorrect,
      mcq_total:             mcqTotal,
      coding_total:          totalCodingQuestions,
      coding_full_pass:      codingFullPass,
      coding_partial:        codingPartial,
      final_score:     finalScore,
    },
  };
};

module.exports = { getCandidateSubmissions, gradeWrittenAnswer };
