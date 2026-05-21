'use strict';
const { verify } = require('../config/jwt');
const AppError = require('../utils/AppError');

const authenticate = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('No token provided', 401));
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = verify(token);
    next();
  } catch (err) {
    // JsonWebTokenError / TokenExpiredError bubble to errorHandler
    next(err);
  }
};

const requireAdmin = (req, _res, next) => {
  if (req.user?.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }
  next();
};

const requireCandidate = (req, _res, next) => {
  if (req.user?.role !== 'candidate') {
    return next(new AppError('Candidate access required', 403));
  }
  next();
};

module.exports = { authenticate, requireAdmin, requireCandidate };
