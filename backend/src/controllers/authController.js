'use strict';
const authService = require('../services/authService');
const { successResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  return successResponse(res, result, 'Login successful');
});

const me = (req, res) => {
  const { id, name, email, role } = req.user;
  return successResponse(res, { id, name, email, role }, 'User retrieved');
};

module.exports = { login, me };
