'use strict';
const { Router }                   = require('express');
const { body, param, query }       = require('express-validator');
const adminController              = require('../controllers/adminController');
const questionController           = require('../controllers/questionController');
const examController               = require('../controllers/examController');
const malpracticeController        = require('../controllers/malpracticeController');
const validate                     = require('../middlewares/validate');

const router = Router();

// ── Registration links ────────────────────────────────────────────────────
router.post('/registration-links', adminController.generateLink);
router.get('/registration-links',  adminController.listLinks);
router.delete('/registration-links/:id', adminController.deactivateLink);

// ── Candidates ────────────────────────────────────────────────────────────
router.get('/candidates',         adminController.listCandidates);
router.get('/candidates/:id',     adminController.getCandidateById);
router.delete(
  '/candidates/:id',
  [param('id').isUUID().withMessage('Invalid candidate ID')],
  validate,
  adminController.deleteCandidate
);

// ── Shared enums ──────────────────────────────────────────────────────────
const SECTIONS = ['quantitative', 'verbal', 'technical', 'coding'];
const TYPES    = ['mcq', 'written', 'coding'];
const DIFFS    = ['easy', 'medium', 'hard'];

// Validates that boilerplate, if present, is a plain object (not array / primitive)
const isPlainObject = (val) => {
  if (typeof val !== 'object' || Array.isArray(val) || val === null) {
    throw new Error('boilerplate must be a plain object');
  }
  return true;
};

// ── Question create rules ─────────────────────────────────────────────────
const createRules = [
  body('section')
    .isIn(SECTIONS)
    .withMessage(`section must be one of: ${SECTIONS.join(', ')}`),
  body('type')
    .isIn(TYPES)
    .withMessage(`type must be one of: ${TYPES.join(', ')}`),
  body('question_text')
    .trim()
    .notEmpty()
    .withMessage('question_text is required'),
  body('difficulty')
    .optional()
    .isIn(DIFFS)
    .withMessage(`difficulty must be one of: ${DIFFS.join(', ')}`),

  // MCQ fields
  body('options')
    .optional()
    .isArray({ min: 2, max: 6 })
    .withMessage('options must be an array of 2–6 items'),
  body('options.*')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Each option must be a non-empty string'),
  body('correct_answer')
    .optional()
    .trim(),

  // Coding fields
  body('sample_input').optional().trim(),
  body('sample_output').optional().trim(),
  body('test_cases')
    .optional()
    .isArray({ min: 1 })
    .withMessage('test_cases must be an array with at least 1 item'),
  body('test_cases.*.input')
    .optional()
    .notEmpty()
    .withMessage('Each test case must have a non-empty input'),
  body('test_cases.*.expected_output')
    .optional()
    .notEmpty()
    .withMessage('Each test case must have a non-empty expected_output'),

  // Boilerplate
  body('boilerplate')
    .optional()
    .custom(isPlainObject),
  body('boilerplate.python').optional().isString(),
  body('boilerplate.javascript').optional().isString(),
  body('boilerplate.cpp').optional().isString(),
];

// ── Question update rules (all body fields optional; id param required) ───
const updateRules = [
  param('id').isUUID().withMessage('Invalid question ID'),
  body('section')
    .optional()
    .isIn(SECTIONS)
    .withMessage(`section must be one of: ${SECTIONS.join(', ')}`),
  body('type')
    .optional()
    .isIn(TYPES)
    .withMessage(`type must be one of: ${TYPES.join(', ')}`),
  body('question_text')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('question_text cannot be set to an empty string'),
  body('difficulty')
    .optional()
    .isIn(DIFFS)
    .withMessage(`difficulty must be one of: ${DIFFS.join(', ')}`),
  body('options')
    .optional()
    .isArray({ min: 2, max: 6 })
    .withMessage('options must be an array of 2–6 items'),
  body('options.*')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Each option must be a non-empty string'),
  body('correct_answer').optional().trim(),
  body('sample_input').optional().trim(),
  body('sample_output').optional().trim(),
  body('test_cases')
    .optional()
    .isArray({ min: 1 })
    .withMessage('test_cases must have at least 1 item'),
  body('test_cases.*.input')
    .optional()
    .notEmpty()
    .withMessage('Each test case must have a non-empty input'),
  body('test_cases.*.expected_output')
    .optional()
    .notEmpty()
    .withMessage('Each test case must have a non-empty expected_output'),
  body('boilerplate')
    .optional()
    .custom(isPlainObject),
];

const idRule = [param('id').isUUID().withMessage('Invalid question ID')];

// ── Question routes ───────────────────────────────────────────────────────
// /bulk MUST be registered before /:id so Express doesn't treat "bulk" as a UUID param.
router.post(
  '/questions/bulk',
  [
    body()
      .custom((val) => {
        if (!Array.isArray(val) || val.length === 0) {
          throw new Error('Request body must be a non-empty array');
        }
        return true;
      }),
  ],
  validate,
  questionController.bulkImport
);

router.post('/questions', createRules, validate, questionController.createQuestion);

router.get(
  '/questions',
  [
    query('section').optional().isIn(SECTIONS).withMessage(`section must be one of: ${SECTIONS.join(', ')}`),
    query('type').optional().isIn(TYPES).withMessage(`type must be one of: ${TYPES.join(', ')}`),
    query('difficulty').optional().isIn(DIFFS).withMessage(`difficulty must be one of: ${DIFFS.join(', ')}`),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
  ],
  validate,
  questionController.listQuestions
);

router.get('/questions/:id',    idRule,      validate, questionController.getQuestion);
router.put('/questions/:id',    updateRules, validate, questionController.updateQuestion);
router.delete('/questions/:id', idRule,      validate, questionController.deleteQuestion);

// ── Exam routes ───────────────────────────────────────────────────────────
const STATUSES = ['draft', 'active', 'completed'];
const examId   = [param('id').isUUID().withMessage('Invalid exam ID')];

// /exams/:id/launch and /exams/:id/results MUST be before /exams/:id
// so Express doesn't swallow the sub-path as part of the UUID.
router.post(
  '/exams/:id/launch',
  [
    ...examId,
    body('candidate_ids')
      .isArray({ min: 1 })
      .withMessage('candidate_ids must be a non-empty array'),
    body('candidate_ids.*').isUUID().withMessage('Each candidate_id must be a valid UUID'),
  ],
  validate,
  examController.launchExam
);

router.get('/exams/:id/results', examId, validate, examController.getResults);

router.post(
  '/exams',
  [
    body('title').trim().notEmpty().withMessage('title is required'),
    body('duration_minutes')
      .isInt({ min: 1 })
      .withMessage('duration_minutes must be a positive integer')
      .toInt(),
    body('sections')
      .isArray({ min: 1 })
      .withMessage('sections must be a non-empty array'),
    body('sections.*')
      .isIn(SECTIONS)
      .withMessage(`Each section must be one of: ${SECTIONS.join(', ')}`),
    body('question_ids')
      .isArray({ min: 1 })
      .withMessage('question_ids must be a non-empty array'),
    body('question_ids.*').isUUID().withMessage('Each question_id must be a valid UUID'),
    body('start_time').optional().isISO8601().withMessage('start_time must be a valid ISO 8601 date'),
    body('end_time').optional().isISO8601().withMessage('end_time must be a valid ISO 8601 date'),
  ],
  validate,
  examController.createExam
);

router.get(
  '/exams',
  [
    query('status')
      .optional()
      .isIn(STATUSES)
      .withMessage(`status must be one of: ${STATUSES.join(', ')}`),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  examController.listExams
);

router.get(
  '/exams/:id/malpractice',
  examId,
  validate,
  malpracticeController.getExamMalpractice
);

const candidateExamId = [
  param('candidateExamId').isUUID().withMessage('Invalid candidate exam ID'),
];

router.get(
  '/candidate-exams/:candidateExamId/malpractice',
  candidateExamId,
  validate,
  malpracticeController.getCandidateExamMalpractice
);

router.get(
  '/candidate-exams/:candidateExamId/review',
  candidateExamId,
  validate,
  examController.reviewCandidateExam
);

router.delete('/exams/:id', examId, validate, examController.deleteExam);
router.get('/exams/:id', examId, validate, examController.getExam);

router.put(
  '/exams/:id',
  [
    ...examId,
    body('title').optional().trim().notEmpty().withMessage('title cannot be empty'),
    body('duration_minutes').optional().isInt({ min: 1 }).toInt(),
    body('sections').optional().isArray({ min: 1 }),
    body('sections.*')
      .optional()
      .isIn(SECTIONS)
      .withMessage(`Each section must be one of: ${SECTIONS.join(', ')}`),
    body('question_ids').optional().isArray({ min: 1 }),
    body('question_ids.*').optional().isUUID().withMessage('Each question_id must be a valid UUID'),
    body('start_time').optional().isISO8601(),
    body('end_time').optional().isISO8601(),
  ],
  validate,
  examController.updateExam
);

module.exports = router;
