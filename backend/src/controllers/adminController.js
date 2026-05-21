'use strict';
const { Op } = require('sequelize');
const { User, RegistrationLink, CandidateExam, Exam } = require('../models');
const registrationService = require('../services/registrationService');
const { successResponse } = require('../utils/response');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/admin/registration-links
const generateLink = asyncHandler(async (req, res) => {
  const result = await registrationService.generateRegistrationLink(req.user.id);
  return successResponse(res, result, 'Registration link generated', 201);
});

// GET /api/admin/registration-links
const listLinks = asyncHandler(async (req, res) => {
  const links = await RegistrationLink.findAll({
    include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'] }],
    order: [['created_at', 'DESC']],
  });
  return successResponse(res, links, 'Registration links retrieved');
});

// DELETE /api/admin/registration-links/:id
const deactivateLink = asyncHandler(async (req, res) => {
  const link = await RegistrationLink.findByPk(req.params.id);
  if (!link) throw new AppError('Registration link not found', 404);
  await link.update({ is_active: false });
  return successResponse(res, link, 'Registration link deactivated');
});

// GET /api/admin/candidates?stream=&batch=&search=&page=1&limit=20
const listCandidates = asyncHandler(async (req, res) => {
  const { stream, batch, search, page = '1', limit = '20' } = req.query;

  const where = { role: 'candidate' };
  if (stream) where.stream = stream;
  if (batch) where.batch = batch;
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password'] },
    order: [['created_at', 'DESC']],
    limit: limitNum,
    offset,
  });

  return successResponse(res, {
    candidates: rows,
    pagination: {
      total: count,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(count / limitNum),
    },
  }, 'Candidates retrieved');
});

// GET /api/admin/candidates/:id
const getCandidateById = asyncHandler(async (req, res) => {
  const candidate = await User.findOne({
    where: { id: req.params.id, role: 'candidate' },
    attributes: { exclude: ['password'] },
    include: [
      {
        model: CandidateExam,
        as: 'candidateExams',
        include: [{ model: Exam, as: 'exam' }],
      },
    ],
  });
  if (!candidate) throw new AppError('Candidate not found', 404);
  return successResponse(res, candidate, 'Candidate retrieved');
});

// DELETE /api/admin/candidates/:id  (soft delete)
const deleteCandidate = asyncHandler(async (req, res) => {
  const user = await User.findOne({ where: { id: req.params.id, role: 'candidate' } });
  if (!user) throw new AppError('Candidate not found', 404);
  await user.destroy();
  return successResponse(res, null, 'Candidate deleted');
});

module.exports = { generateLink, listLinks, deactivateLink, listCandidates, getCandidateById, deleteCandidate };
