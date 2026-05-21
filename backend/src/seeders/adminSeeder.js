'use strict';
const bcrypt = require('bcryptjs');
const { User } = require('../models');

const seedAdmin = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME;

  if (!email || !password || !name) {
    console.warn('[adminSeeder] ADMIN_EMAIL, ADMIN_PASSWORD, or ADMIN_NAME not set — skipping.');
    return;
  }

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    console.log(`[adminSeeder] Admin "${email}" already exists — skipping.`);
    return;
  }

  const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
  const hashedPassword = await bcrypt.hash(password, rounds);

  await User.create({ name, email, password: hashedPassword, role: 'admin', is_registered: true });
  console.log(`[adminSeeder] Admin "${email}" created.`);
};

module.exports = seedAdmin;
