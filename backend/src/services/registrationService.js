'use strict';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { RegistrationLink, User } = require('../models');
const AppError = require('../utils/AppError');

// Pure validity check — no side effects. Used by the public validate endpoint.
const checkTokenValidity = async (token) => {
  const link = await RegistrationLink.findOne({ where: { token } });
  if (!link) throw new AppError('Registration link not found', 404);
  if (!link.is_active) throw new AppError('Registration link is no longer active', 410);
  if (link.expires_at && link.expires_at < new Date()) {
    throw new AppError('Registration link has expired', 410);
  }
  return link;
};

const generateRegistrationLink = async (adminId) => {
  const token = crypto.randomBytes(32).toString('hex');
  const expires_at = new Date(Date.now() + 105 * 60 * 1000);

  const record = await RegistrationLink.create({
    token,
    created_by: adminId,
    is_active: true,
    expires_at,
  });

  return {
    link: `${process.env.FRONTEND_URL}/register/${token}`,
    token: record.token,
    expires_at: record.expires_at,
  };
};

// Validates AND increments usage_count. Called once per successful registration attempt.
const validateRegistrationToken = async (token) => {
  const link = await checkTokenValidity(token);
  await link.increment('usage_count');
  return link;
};

const registerCandidate = async (token, { name, email, password, stream, sgpa, interested_area, batch }) => {
  await validateRegistrationToken(token);

  const emailTaken = await User.findOne({ where: { email } });
  if (emailTaken) throw new AppError('Email already registered', 409);

  const nameDup = await User.findOne({ where: { name, batch, stream } });
  if (nameDup) throw new AppError('Candidate with this name, batch and stream already exists', 409);

  const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
  const hashedPassword = await bcrypt.hash(password, rounds);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    stream,
    sgpa,
    interested_area,
    batch,
    role: 'candidate',
    is_registered: true,
  });

  const userObj = user.toJSON();
  delete userObj.password;
  return userObj;
};

module.exports = { generateRegistrationLink, validateRegistrationToken, registerCandidate, checkTokenValidity };
