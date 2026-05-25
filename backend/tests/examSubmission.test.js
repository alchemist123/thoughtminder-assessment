'use strict';
require('dotenv').config();
const request = require('supertest');
const bcrypt  = require('bcryptjs');
const app     = require('../src/app');
const { User, Exam, Question, ExamQuestion, CandidateExam, Submission, sequelize } = require('../src/models');

// ── Helpers ───────────────────────────────────────────────────────────────

let candidateToken;
let candidateId;
let examId;
let questionId;
let candidateExamId;

async function loginCandidate() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'test_candidate@test.local', password: 'Candidate@999' });
  return res.body.data?.token;
}

// ── Setup / Teardown ──────────────────────────────────────────────────────

beforeAll(async () => {
  // Create candidate user
  const hashed = await bcrypt.hash('Candidate@999', 10);
  const candidate = await User.create({
    name: 'Test Candidate',
    email: 'test_candidate@test.local',
    password: hashed,
    role: 'candidate',
    is_registered: true,
  });
  candidateId = candidate.id;

  // Create one MCQ question
  const question = await Question.create({
    section: 'quantitative',
    type: 'mcq',
    question_text: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'],
    correct_answer: '4',
    difficulty: 'easy',
  });
  questionId = question.id;

  // Create exam
  const exam = await Exam.create({
    title: 'Test Exam',
    duration_minutes: 60,
    sections: ['quantitative'],
    status: 'active',
  });
  examId = exam.id;

  // Link question to exam
  await ExamQuestion.create({ exam_id: examId, question_id: questionId, order: 1 });

  // Assign candidate to exam (no passcode)
  const ce = await CandidateExam.create({
    exam_id: examId,
    candidate_id: candidateId,
    status: 'pending',
  });
  candidateExamId = ce.id;

  // Log in
  candidateToken = await loginCandidate();
});

afterAll(async () => {
  // Clean up all test data in dependency order
  await Submission.destroy({ where: { candidate_exam_id: candidateExamId }, force: true });
  await CandidateExam.destroy({ where: { id: candidateExamId }, force: true });
  await ExamQuestion.destroy({ where: { exam_id: examId } });
  await Exam.destroy({ where: { id: examId }, force: true });
  await Question.destroy({ where: { id: questionId }, force: true });
  await User.destroy({ where: { id: candidateId }, force: true });
  await sequelize.close();
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe('Exam Submission Flow', () => {

  describe('POST /api/exam/start', () => {
    it('rejects a request without auth', async () => {
      const res = await request(app)
        .post('/api/exam/start')
        .send({ exam_id: examId });
      expect(res.status).toBe(401);
    });

    it('rejects if candidate is not assigned to the exam', async () => {
      const res = await request(app)
        .post('/api/exam/start')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ exam_id: '00000000-0000-0000-0000-000000000000' });
      expect(res.status).toBe(404);
    });

    it('starts the exam for an assigned candidate', async () => {
      const res = await request(app)
        .post('/api/exam/start')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ exam_id: examId });
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('candidateExam');
      expect(res.body.data).toHaveProperty('exam');
      expect(res.body.data.candidateExam.status).toBe('started');
    });

    it('resumes without error if already started', async () => {
      const res = await request(app)
        .post('/api/exam/start')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ exam_id: examId });
      expect(res.status).toBe(200);
      expect(res.body.data.resumed).toBe(true);
    });

    it('does not expose correct_answer in exam data', async () => {
      const res = await request(app)
        .post('/api/exam/start')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ exam_id: examId });
      const allQuestions = Object.values(res.body.data?.exam?.questionsBySection ?? {}).flat();
      allQuestions.forEach((q) => {
        expect(q).not.toHaveProperty('correct_answer');
      });
    });
  });

  describe('POST /api/exam/answer', () => {
    it('rejects an answer without auth', async () => {
      const res = await request(app)
        .post('/api/exam/answer')
        .send({ candidate_exam_id: candidateExamId, question_id: questionId, selected_option: '4' });
      expect(res.status).toBe(401);
    });

    it('saves a correct MCQ answer', async () => {
      const res = await request(app)
        .post('/api/exam/answer')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ candidate_exam_id: candidateExamId, question_id: questionId, selected_option: '4' });
      expect(res.status).toBe(200);
      expect(res.body.data.selected_option).toBe('4');
      expect(res.body.data.is_correct).toBe(true);
    });

    it('updates the answer if re-submitted (wrong option)', async () => {
      const res = await request(app)
        .post('/api/exam/answer')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ candidate_exam_id: candidateExamId, question_id: questionId, selected_option: '3' });
      expect(res.status).toBe(200);
      expect(res.body.data.is_correct).toBe(false);
    });

    it('updates the answer back to the correct option', async () => {
      const res = await request(app)
        .post('/api/exam/answer')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ candidate_exam_id: candidateExamId, question_id: questionId, selected_option: '4' });
      expect(res.status).toBe(200);
      expect(res.body.data.is_correct).toBe(true);
    });
  });

  describe('POST /api/exam/submit', () => {
    it('rejects submission without auth', async () => {
      const res = await request(app)
        .post('/api/exam/submit')
        .send({ candidate_exam_id: candidateExamId });
      expect(res.status).toBe(401);
    });

    it('submits the exam, returns a score, and transitions candidateExam to submitted', async () => {
      const res = await request(app)
        .post('/api/exam/submit')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ candidate_exam_id: candidateExamId });
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('score');
      // 1 correct MCQ out of 1 → 100
      expect(res.body.data.score).toBe(100);

      const ce = await CandidateExam.findByPk(candidateExamId);
      expect(ce.status).toBe('submitted');
      expect(ce.submitted_at).not.toBeNull();
    });

    it('marks the exam as completed when the last candidate submits', async () => {
      const exam = await Exam.findByPk(examId);
      expect(exam.status).toBe('completed');
    });

    it('rejects a second submission of the same session', async () => {
      const res = await request(app)
        .post('/api/exam/submit')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ candidate_exam_id: candidateExamId });
      expect(res.status).toBe(400);
    });

    it('rejects restarting an already-submitted exam', async () => {
      const res = await request(app)
        .post('/api/exam/start')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ exam_id: examId });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/exam/session/:candidate_exam_id', () => {
    it('returns session data including submissions', async () => {
      const res = await request(app)
        .get(`/api/exam/session/${candidateExamId}`)
        .set('Authorization', `Bearer ${candidateToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('submissions');
      expect(res.body.data.submissions.length).toBeGreaterThan(0);
    });
  });
});
