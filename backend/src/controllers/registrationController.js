'use strict';
const registrationService = require('../services/registrationService');
const { successResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/register/validate/:token
const validateToken = asyncHandler(async (req, res) => {
  const link = await registrationService.checkTokenValidity(req.params.token);
  return successResponse(res, { valid: true, expires_at: link.expires_at }, 'Token is valid');
});

// POST /api/register/:token
const registerCandidate = asyncHandler(async (req, res) => {
  const user = await registrationService.registerCandidate(req.params.token, req.body);
  return successResponse(res, user, 'Registration successful', 201);
});

module.exports = { validateToken, registerCandidate };
