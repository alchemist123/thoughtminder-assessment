'use strict';
const { ValidationError, UniqueConstraintError, DatabaseError, ForeignKeyConstraintError } = require('sequelize');
const { JsonWebTokenError, TokenExpiredError } = require('jsonwebtoken');
const AppError = require('../utils/AppError');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  // Sequelize field-level validation errors
  if (err instanceof ValidationError) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // Sequelize unique constraint (duplicate record)
  if (err instanceof UniqueConstraintError) {
    const field = err.errors[0]?.path ?? 'field';
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // JWT signature / malformed token
  if (err instanceof JsonWebTokenError) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  // JWT expired
  if (err instanceof TokenExpiredError) {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  // Known operational error created with AppError
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // Sequelize FK violation (e.g. referencing a deleted record)
  if (err instanceof ForeignKeyConstraintError) {
    console.error('[FK constraint error]', err.message);
    return res.status(409).json({ success: false, message: 'A referenced record no longer exists.' });
  }

  // Generic Sequelize DB error (connection issues, bad queries, etc.)
  if (err instanceof DatabaseError) {
    console.error('[Database error]', err.message);
    return res.status(500).json({ success: false, message: `Database error: ${err.message}` });
  }

  // Unknown / programmer errors — never leak internals
  console.error('[Unhandled error]', err);
  return res.status(500).json({ success: false, message: 'Internal server error' });
};

module.exports = errorHandler;
