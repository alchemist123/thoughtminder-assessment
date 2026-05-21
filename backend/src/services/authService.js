'use strict';
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { sign, verify } = require('../config/jwt');
const AppError = require('../utils/AppError');

const INVALID_CREDENTIALS = 'Invalid email or password';

const login = async (email, password) => {
  const user = await User.findOne({ where: { email } });
  if (!user) throw new AppError(INVALID_CREDENTIALS, 401);

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new AppError(INVALID_CREDENTIALS, 401);

  const token = sign({ id: user.id, name: user.name, email: user.email, role: user.role });

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
};

const verifyToken = (token) => verify(token);

module.exports = { login, verifyToken };
