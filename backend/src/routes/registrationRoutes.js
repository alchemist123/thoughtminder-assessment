'use strict';
const { Router } = require('express');
const { body } = require('express-validator');
const registrationController = require('../controllers/registrationController');
const validate = require('../middlewares/validate');

const router = Router();

router.get('/validate/:token', registrationController.validateToken);

router.post(
  '/:token',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('stream').trim().notEmpty().withMessage('Stream is required'),
    body('sgpa')
      .isFloat({ min: 0, max: 10 })
      .withMessage('SGPA must be a number between 0 and 10'),
    body('interested_area').trim().notEmpty().withMessage('Interested area is required'),
    body('batch').trim().notEmpty().withMessage('Batch is required'),
  ],
  validate,
  registrationController.registerCandidate
);

module.exports = router;
