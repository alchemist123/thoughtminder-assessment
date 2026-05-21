'use strict';
/**
 * Post-migration setup script.
 * Run via: npm run setup
 * (which executes: npx sequelize-cli db:migrate && node scripts/setup.js)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const sequelize = require('../src/config/database');
const seedAdmin = require('../src/seeders/adminSeeder');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('[setup] Database connection verified.');

    await seedAdmin();
    console.log('[setup] Admin user seeded.');

    console.log('[setup] Setup complete. You can now start the server with: npm run dev');
    process.exit(0);
  } catch (err) {
    console.error('[setup] Setup failed:', err.message);
    process.exit(1);
  }
})();
