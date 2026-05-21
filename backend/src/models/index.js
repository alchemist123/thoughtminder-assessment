'use strict';
const sequelize = require('../config/database');

const User = require('./User')(sequelize);
const RegistrationLink = require('./RegistrationLink')(sequelize);
const Question = require('./Question')(sequelize);
const Exam = require('./Exam')(sequelize);
const ExamQuestion = require('./ExamQuestion')(sequelize);
const CandidateExam = require('./CandidateExam')(sequelize);
const Submission = require('./Submission')(sequelize);
const MalpracticeLog = require('./MalpracticeLog')(sequelize);

// ── User ↔ RegistrationLink ───────────────────────────────────────────────
User.hasMany(RegistrationLink, { foreignKey: 'created_by', as: 'registrationLinks' });
RegistrationLink.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// ── Exam ↔ Question (through ExamQuestion) ────────────────────────────────
Exam.hasMany(ExamQuestion, { foreignKey: 'exam_id', as: 'examQuestions', onDelete: 'CASCADE' });
ExamQuestion.belongsTo(Exam, { foreignKey: 'exam_id' });

Question.hasMany(ExamQuestion, { foreignKey: 'question_id', as: 'examQuestions', onDelete: 'CASCADE' });
ExamQuestion.belongsTo(Question, { foreignKey: 'question_id', as: 'question' });

Exam.belongsToMany(Question, {
  through: ExamQuestion,
  foreignKey: 'exam_id',
  otherKey: 'question_id',
  as: 'questions',
});
Question.belongsToMany(Exam, {
  through: ExamQuestion,
  foreignKey: 'question_id',
  otherKey: 'exam_id',
  as: 'exams',
});

// ── Exam / User ↔ CandidateExam ──────────────────────────────────────────
Exam.hasMany(CandidateExam, { foreignKey: 'exam_id', as: 'candidateExams', onDelete: 'CASCADE' });
CandidateExam.belongsTo(Exam, { foreignKey: 'exam_id', as: 'exam' });

User.hasMany(CandidateExam, { foreignKey: 'candidate_id', as: 'candidateExams' });
CandidateExam.belongsTo(User, { foreignKey: 'candidate_id', as: 'candidate' });

// ── CandidateExam / Question ↔ Submission ────────────────────────────────
CandidateExam.hasMany(Submission, {
  foreignKey: 'candidate_exam_id',
  as: 'submissions',
  onDelete: 'CASCADE',
});
Submission.belongsTo(CandidateExam, { foreignKey: 'candidate_exam_id', as: 'candidateExam' });

Question.hasMany(Submission, { foreignKey: 'question_id', as: 'submissions' });
Submission.belongsTo(Question, { foreignKey: 'question_id', as: 'question' });

// ── CandidateExam / User ↔ MalpracticeLog ────────────────────────────────
CandidateExam.hasMany(MalpracticeLog, {
  foreignKey: 'candidate_exam_id',
  as: 'malpracticeLogs',
  onDelete: 'CASCADE',
});
MalpracticeLog.belongsTo(CandidateExam, {
  foreignKey: 'candidate_exam_id',
  as: 'candidateExam',
});
MalpracticeLog.belongsTo(User, {
  foreignKey: 'candidate_id',
  as: 'candidate',
});

module.exports = {
  sequelize,
  User,
  RegistrationLink,
  Question,
  Exam,
  ExamQuestion,
  CandidateExam,
  Submission,
  MalpracticeLog,
};
