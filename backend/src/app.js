require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middlewares/errorHandler');
const { authenticate, requireAdmin, requireCandidate } = require('./middlewares/auth');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', authenticate, requireAdmin, require('./routes/adminRoutes'));
app.use('/api/register', require('./routes/registrationRoutes'));
app.use('/api/exam', authenticate, requireCandidate, require('./routes/candidateExamRoutes'));
app.use('/api/code',    authenticate, requireCandidate, require('./routes/codeRoutes'));
app.use('/api/proctor', authenticate, requireCandidate, require('./routes/proctorRoutes'));

app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

app.use(errorHandler);

module.exports = app;
