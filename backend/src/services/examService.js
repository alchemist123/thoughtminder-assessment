'use strict';
const crypto = require('crypto');
const { Exam, Question, ExamQuestion, CandidateExam, User, MalpracticeLog, sequelize } = require('../models');
const AppError = require('../utils/AppError');

const PASSCODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// ── Shared query ──────────────────────────────────────────────────────────

const getExamWithQuestions = async (examId) => {
  const exam = await Exam.findByPk(examId, {
    include: [
      {
        model: ExamQuestion,
        as: 'examQuestions',
        include: [{ model: Question, as: 'question' }],
      },
    ],
    order: [[{ model: ExamQuestion, as: 'examQuestions' }, 'order_index', 'ASC']],
  });
  if (!exam) throw new AppError('Exam not found', 404);

  const examObj = exam.toJSON();

  // Group questions by section for easy frontend rendering
  const questionsBySection = {};
  for (const eq of examObj.examQuestions) {
    const { section } = eq.question;
    if (!questionsBySection[section]) questionsBySection[section] = [];
    questionsBySection[section].push({ ...eq.question, order_index: eq.order_index });
  }
  examObj.questionsBySection = questionsBySection;

  return examObj;
};

// ── Helpers ───────────────────────────────────────────────────────────────

const validateQuestionsAgainstSections = (questions, sections, questionIds) => {
  if (questions.length !== questionIds.length) {
    const foundIds = new Set(questions.map((q) => q.id));
    const missing = questionIds.filter((id) => !foundIds.has(id));
    throw new AppError(`Questions not found: ${missing.join(', ')}`, 404);
  }
  const invalid = questions.find((q) => !sections.includes(q.section));
  if (invalid) {
    throw new AppError(
      `Question ${invalid.id} belongs to section '${invalid.section}', ` +
        `which is not declared in sections: [${sections.join(', ')}]`,
      422
    );
  }
};

// ── Service functions ─────────────────────────────────────────────────────

const createExam = async ({ title, duration_minutes, sections, question_ids, start_time, end_time }) => {
  const questions = await Question.findAll({ where: { id: question_ids } });
  validateQuestionsAgainstSections(questions, sections, question_ids);

  const t = await sequelize.transaction();
  try {
    const exam = await Exam.create(
      { title, duration_minutes, sections, start_time, end_time, status: 'draft' },
      { transaction: t }
    );
    await ExamQuestion.bulkCreate(
      question_ids.map((qId, idx) => ({ exam_id: exam.id, question_id: qId, order_index: idx })),
      { transaction: t }
    );
    await t.commit();
    return getExamWithQuestions(exam.id);
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

const updateExam = async (id, data) => {
  const exam = await Exam.findByPk(id);
  if (!exam) throw new AppError('Exam not found', 404);
  if (exam.status !== 'draft') {
    throw new AppError(
      `Cannot modify an exam with status '${exam.status}'. Only draft exams can be updated.`,
      400
    );
  }

  const { question_ids, ...examFields } = data;

  const t = await sequelize.transaction();
  try {
    if (Object.keys(examFields).length > 0) {
      await exam.update(examFields, { transaction: t });
    }

    if (Array.isArray(question_ids)) {
      const effectiveSections = examFields.sections ?? exam.sections ?? [];
      const questions = await Question.findAll({ where: { id: question_ids } });
      validateQuestionsAgainstSections(questions, effectiveSections, question_ids);

      await ExamQuestion.destroy({ where: { exam_id: id }, transaction: t });
      await ExamQuestion.bulkCreate(
        question_ids.map((qId, idx) => ({ exam_id: id, question_id: qId, order_index: idx })),
        { transaction: t }
      );
    }

    await t.commit();
    return getExamWithQuestions(id);
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

const listExams = async ({ status, page = 1, limit = 20 } = {}) => {
  const where = {};
  if (status) where.status = status;

  const pageNum  = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const total = await Exam.count({ where });

  const exams = await Exam.findAll({
    where,
    attributes: {
      include: [
        [
          sequelize.literal(
            `(SELECT COUNT(*) FROM candidate_exams WHERE candidate_exams.exam_id = "Exam"."id")`
          ),
          'candidate_count',
        ],
      ],
    },
    order:  [['created_at', 'DESC']],
    limit:  limitNum,
    offset: (pageNum - 1) * limitNum,
  });

  return {
    exams,
    pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
  };
};

const launchExam = async (examId, candidateIds) => {
  const exam = await Exam.findByPk(examId);
  if (!exam) throw new AppError('Exam not found', 404);
  if (exam.status !== 'draft') {
    throw new AppError(
      `Only draft exams can be launched. Current status: '${exam.status}'`,
      400
    );
  }

  const questionCount = await ExamQuestion.count({ where: { exam_id: examId } });
  if (questionCount === 0) throw new AppError('Cannot launch an exam with no questions', 400);

  // Validate every id refers to a registered candidate
  const candidates = await User.findAll({
    where: { id: candidateIds, role: 'candidate' },
    attributes: ['id', 'name', 'email'],
  });
  if (candidates.length !== candidateIds.length) {
    const foundIds = new Set(candidates.map((c) => c.id));
    const missing = candidateIds.filter((id) => !foundIds.has(id));
    throw new AppError(`Candidates not found or not valid: ${missing.join(', ')}`, 404);
  }

  const now = new Date();
  const t   = await sequelize.transaction();
  try {
    await CandidateExam.bulkCreate(
      candidates.map((c) => ({
        exam_id:      examId,
        candidate_id: c.id,
        status:       'pending',
      })),
      { transaction: t }
    );
    await exam.update({ status: 'active', start_time: now }, { transaction: t });
    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  return candidates.map((c) => ({
    candidate:   { id: c.id, name: c.name, email: c.email },
    access_link: `${process.env.FRONTEND_URL}/exam/${examId}`,
  }));
};

// ── Exam detail: questions + candidate sessions with malpractice counts ───

const getExamWithCandidates = async (examId) => {
  const exam = await getExamWithQuestions(examId);

  const sessions = await CandidateExam.findAll({
    where: { exam_id: examId },
    include: [
      {
        model:      User,
        as:         'candidate',
        attributes: ['id', 'name', 'email', 'stream', 'batch'],
      },
    ],
    attributes: {
      include: [
        [
          sequelize.literal(
            `(SELECT COUNT(*) FROM malpractice_logs ` +
            `WHERE malpractice_logs.candidate_exam_id = "CandidateExam"."id")`
          ),
          'malpractice_count',
        ],
      ],
    },
    order: [[{ model: User, as: 'candidate' }, 'name', 'ASC']],
  });

  return {
    ...exam,
    candidates: sessions.map((s) => s.toJSON()),
  };
};

module.exports = {
  createExam,
  updateExam,
  getExamWithQuestions,
  getExamWithCandidates,
  listExams,
  launchExam,
};
