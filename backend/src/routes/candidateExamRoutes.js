'use strict';
const { Router }  = require('express');
const { body, param } = require('express-validator');
const controller  = require('../controllers/candidateExamController');
const validate    = require('../middlewares/validate');

const router = Router();

// POST /api/exam/start
router.post(
  '/start',
  [
    body('exam_id').isUUID().withMessage('exam_id must be a valid UUID'),
    body('passcode').trim().notEmpty().withMessage('passcode is required'),
  ],
  validate,
  controller.startExam
);

// POST /api/exam/answer
router.post(
  '/answer',
  [
    body('candidate_exam_id').isUUID().withMessage('candidate_exam_id must be a valid UUID'),
    body('question_id').isUUID().withMessage('question_id must be a valid UUID'),
    body('answer_text').optional().trim(),
    body('selected_option').optional().trim(),
  ],
  validate,
  controller.submitAnswer
);

// POST /api/exam/submit
router.post(
  '/submit',
  [body('candidate_exam_id').isUUID().withMessage('candidate_exam_id must be a valid UUID')],
  validate,
  controller.submitExam
);

// GET /api/exam/session/:candidate_exam_id
router.get(
  '/session/:candidate_exam_id',
  [param('candidate_exam_id').isUUID().withMessage('Invalid session ID')],
  validate,
  controller.getSession
);

// GET /api/exam/my-exams
router.get('/my-exams', controller.myExams);

module.exports = router;
