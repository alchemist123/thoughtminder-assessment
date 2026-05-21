'use strict';
const { Router } = require('express');
const { body }   = require('express-validator');
const malpracticeController = require('../controllers/malpracticeController');
const validate = require('../middlewares/validate');

const router = Router();

const MALPRACTICE_TYPES = ['tab_switch', 'multiple_faces', 'no_face', 'camera_blocked'];

router.post(
  '/log',
  [
    body('candidate_exam_id')
      .isUUID()
      .withMessage('candidate_exam_id must be a valid UUID'),
    body('exam_id')
      .isUUID()
      .withMessage('exam_id must be a valid UUID'),
    body('type')
      .isIn(MALPRACTICE_TYPES)
      .withMessage(`type must be one of: ${MALPRACTICE_TYPES.join(', ')}`),
    body('snapshot_base64')
      .optional({ nullable: true })
      .isString()
      .withMessage('snapshot_base64 must be a string'),
    body('snapshot_mime')
      .optional({ nullable: true })
      .isString()
      .withMessage('snapshot_mime must be a string'),
    body('detected_faces')
      .optional({ nullable: true })
      .isInt({ min: 0 })
      .withMessage('detected_faces must be a non-negative integer')
      .toInt(),
    body('metadata')
      .optional({ nullable: true })
      .isObject()
      .withMessage('metadata must be an object'),
  ],
  validate,
  malpracticeController.logMalpractice
);

module.exports = router;
