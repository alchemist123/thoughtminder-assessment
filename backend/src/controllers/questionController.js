'use strict';
const questionService = require('../services/questionService');
const { successResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const createQuestion = asyncHandler(async (req, res) => {
  const question = await questionService.createQuestion(req.body);
  return successResponse(res, question, 'Question created', 201);
});

const listQuestions = asyncHandler(async (req, res) => {
  const { section, type, difficulty, search, page, limit } = req.query;
  const result = await questionService.getQuestions({ section, type, difficulty, search, page, limit });
  return successResponse(res, result, 'Questions retrieved');
});

const getQuestion = asyncHandler(async (req, res) => {
  const question = await questionService.getQuestionById(req.params.id);
  return successResponse(res, question, 'Question retrieved');
});

const updateQuestion = asyncHandler(async (req, res) => {
  const question = await questionService.updateQuestion(req.params.id, req.body);
  return successResponse(res, question, 'Question updated');
});

const deleteQuestion = asyncHandler(async (req, res) => {
  await questionService.deleteQuestion(req.params.id);
  return successResponse(res, null, 'Question deleted');
});

// POST /api/admin/questions/bulk
// Body is an array. Returns 201 on full success, 207 on partial success, 422 if nothing was imported.
const bulkImport = asyncHandler(async (req, res) => {
  const result = await questionService.bulkImportQuestions(req.body);

  let statusCode = 201;
  if (result.created === 0) statusCode = 422;
  else if (result.failed.length > 0) statusCode = 207;

  return successResponse(
    res,
    result,
    `${result.created} question(s) imported, ${result.failed.length} failed`,
    statusCode
  );
});

module.exports = { createQuestion, listQuestions, getQuestion, updateQuestion, deleteQuestion, bulkImport };
