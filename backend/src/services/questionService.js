'use strict';
const { Op } = require('sequelize');
const { Question, ExamQuestion, Exam, sequelize } = require('../models');
const AppError = require('../utils/AppError');

// ── Allowed section → type combinations ──────────────────────────────────
const VALID_COMBINATIONS = {
  quantitative: ['mcq'],
  verbal:       ['mcq'],
  technical:    ['mcq', 'written'],
  coding:       ['coding'],
};

// ── Core validator (used by create, update-merge, and bulk import) ─────────
const validateQuestion = ({ section, type, question_text, options, correct_answer,
                            sample_input, sample_output, test_cases, boilerplate }) => {
  if (!VALID_COMBINATIONS[section]?.includes(type)) {
    throw new AppError(
      `Section '${section}' does not support type '${type}'. ` +
      `Allowed types: ${VALID_COMBINATIONS[section]?.join(', ') ?? 'none'}`,
      422
    );
  }

  if (!question_text?.trim()) {
    throw new AppError('question_text is required', 422);
  }

  if (type === 'mcq') {
    if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
      throw new AppError('MCQ questions require 2–6 options', 422);
    }
    if (!options.every((o) => typeof o === 'string' && o.trim().length > 0)) {
      throw new AppError('Every option must be a non-empty string', 422);
    }
    if (!correct_answer || !options.includes(correct_answer)) {
      throw new AppError('correct_answer must exactly match one of the options', 422);
    }
  }

  if (type === 'written') {
    if (!correct_answer?.trim()) {
      throw new AppError('Written questions require correct_answer (model answer text)', 422);
    }
  }

  if (type === 'coding') {
    if (!sample_input?.trim()) throw new AppError('Coding questions require sample_input', 422);
    if (!sample_output?.trim()) throw new AppError('Coding questions require sample_output', 422);

    if (!Array.isArray(test_cases) || test_cases.length < 1) {
      throw new AppError('test_cases must be an array with at least 1 item', 422);
    }
    for (const [i, tc] of test_cases.entries()) {
      if (typeof tc !== 'object' || tc === null) {
        throw new AppError(`test_cases[${i}]: must be an object with input and expected_output`, 422);
      }
      if (String(tc.input ?? '').trim() === '') {
        throw new AppError(`test_cases[${i}]: input is required`, 422);
      }
      if (String(tc.expected_output ?? '').trim() === '') {
        throw new AppError(`test_cases[${i}]: expected_output is required`, 422);
      }
    }

    if (boilerplate != null) {
      if (typeof boilerplate !== 'object' || Array.isArray(boilerplate)) {
        throw new AppError('boilerplate must be an object', 422);
      }
      const invalid = Object.keys(boilerplate).filter(
        (k) => !['python', 'javascript', 'cpp'].includes(k)
      );
      if (invalid.length) {
        throw new AppError(`boilerplate has unrecognised keys: ${invalid.join(', ')}`, 422);
      }
    }
  }
};

// ── Merge update payload with existing row before re-validating ───────────
const mergeWithExisting = (existing, data) => ({
  section:        data.section        !== undefined ? data.section        : existing.section,
  type:           data.type           !== undefined ? data.type           : existing.type,
  question_text:  data.question_text  !== undefined ? data.question_text  : existing.question_text,
  options:        data.options        !== undefined ? data.options        : existing.options,
  correct_answer: data.correct_answer !== undefined ? data.correct_answer : existing.correct_answer,
  sample_input:   data.sample_input   !== undefined ? data.sample_input   : existing.sample_input,
  sample_output:  data.sample_output  !== undefined ? data.sample_output  : existing.sample_output,
  test_cases:     data.test_cases     !== undefined ? data.test_cases     : existing.test_cases,
  boilerplate:    data.boilerplate    !== undefined ? data.boilerplate    : existing.boilerplate,
});

// ── Public service functions ──────────────────────────────────────────────

const createQuestion = async (data) => {
  validateQuestion(data);
  return Question.create(data);
};

const updateQuestion = async (id, data) => {
  const question = await Question.findByPk(id);
  if (!question) throw new AppError('Question not found', 404);

  validateQuestion(mergeWithExisting(question, data));

  await question.update(data);
  return question.reload();
};

const deleteQuestion = async (id) => {
  const question = await Question.findByPk(id);
  if (!question) throw new AppError('Question not found', 404);

  const activeUsage = await ExamQuestion.findOne({
    where: { question_id: id },
    include: [{ model: Exam, as: 'exam', where: { status: 'active' }, required: true }],
  });
  if (activeUsage) {
    throw new AppError(
      'Cannot delete: this question is used in an active exam. Deactivate the exam first.',
      409
    );
  }

  await question.destroy();
};

const getQuestions = async ({ section, type, difficulty, search, page = 1, limit = 20 } = {}) => {
  const where = {};
  if (section)    where.section    = section;
  if (type)       where.type       = type;
  if (difficulty) where.difficulty = difficulty;
  if (search)     where.question_text = { [Op.iLike]: `%${search}%` };

  const pageNum  = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const { count, rows } = await Question.findAndCountAll({
    where,
    order:  [['created_at', 'DESC']],
    limit:  limitNum,
    offset: (pageNum - 1) * limitNum,
  });

  return {
    questions:  rows,
    pagination: { total: count, page: pageNum, limit: limitNum, pages: Math.ceil(count / limitNum) },
  };
};

const getQuestionById = async (id) => {
  const question = await Question.findByPk(id);
  if (!question) throw new AppError('Question not found', 404);
  return question;
};

const bulkImportQuestions = async (items) => {
  const failed    = [];
  const validRows = [];

  for (let i = 0; i < items.length; i++) {
    try {
      validateQuestion(items[i]);
      validRows.push({ index: i, data: items[i] });
    } catch (err) {
      failed.push({ index: i, reason: err.message });
    }
  }

  let created = 0;
  if (validRows.length > 0) {
    const t = await sequelize.transaction();
    try {
      await Question.bulkCreate(validRows.map((r) => r.data), { transaction: t });
      await t.commit();
      created = validRows.length;
    } catch (err) {
      await t.rollback();
      for (const v of validRows) {
        failed.push({ index: v.index, reason: err.message });
      }
    }
  }

  return { created, failed };
};

module.exports = {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestions,
  getQuestionById,
  bulkImportQuestions,
};
