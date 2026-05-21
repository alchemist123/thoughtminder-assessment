'use strict';
const { Router } = require('express');
const { body }   = require('express-validator');
const controller = require('../controllers/codeController');
const validate   = require('../middlewares/validate');

const router = Router();

const LANGUAGES = ['python', 'javascript', 'cpp'];

const commonRules = [
  body('source_code').notEmpty().withMessage('source_code is required'),
  body('language')
    .isIn(LANGUAGES)
    .withMessage(`language must be one of: ${LANGUAGES.join(', ')}`),
  body('candidate_exam_id').isUUID().withMessage('candidate_exam_id must be a valid UUID'),
  body('question_id').isUUID().withMessage('question_id must be a valid UUID'),
];

// POST /api/code/run — execute against sample_input, result NOT persisted
router.post(
  '/run',
  [
    ...commonRules,
    body('sample_input').optional(),
  ],
  validate,
  controller.run
);

// POST /api/code/submit — execute against all test cases, persists Submission
router.post(
  '/submit',
  commonRules,
  validate,
  controller.submit
);

module.exports = router;
