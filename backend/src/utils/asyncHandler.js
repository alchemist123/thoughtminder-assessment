'use strict';

/**
 * Wraps an async route handler so errors are forwarded to Express's next().
 * Eliminates the need for manual try/catch in every controller.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
