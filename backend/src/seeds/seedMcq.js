'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Question, sequelize } = require('../models');

const questions = [
  // ── Quantitative (2 MCQ) ─────────────────────────────────────────────────
  {
    section: 'quantitative',
    type: 'mcq',
    difficulty: 'easy',
    question_text: 'A train travels 360 km in 4 hours. What is its speed in km/h?',
    options: ['80', '90', '100', '120'],
    correct_answer: '90',
  },
  {
    section: 'quantitative',
    type: 'mcq',
    difficulty: 'medium',
    question_text: 'If 40% of a number is 120, what is 25% of that number?',
    options: ['60', '65', '75', '80'],
    correct_answer: '75',
  },

  // ── Verbal (2 MCQ) ───────────────────────────────────────────────────────
  {
    section: 'verbal',
    type: 'mcq',
    difficulty: 'easy',
    question_text: 'Choose the word most similar in meaning to "ELOQUENT".',
    options: ['Talkative', 'Fluent', 'Noisy', 'Timid'],
    correct_answer: 'Fluent',
  },
  {
    section: 'verbal',
    type: 'mcq',
    difficulty: 'medium',
    question_text: 'Select the correct sentence.',
    options: [
      'Each of the students have submitted their assignment.',
      'Each of the students has submitted their assignment.',
      'Each of the students have submitted his assignment.',
      'Each of the students has submitted his assignment.',
    ],
    correct_answer: 'Each of the students has submitted their assignment.',
  },

  // ── Technical (2 MCQ) ────────────────────────────────────────────────────
  {
    section: 'technical',
    type: 'mcq',
    difficulty: 'easy',
    question_text: 'What is the time complexity of binary search on a sorted array of n elements?',
    options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
    correct_answer: 'O(log n)',
  },
  {
    section: 'technical',
    type: 'mcq',
    difficulty: 'medium',
    question_text: 'Which data structure uses LIFO (Last In First Out) order?',
    options: ['Queue', 'Stack', 'Linked List', 'Binary Tree'],
    correct_answer: 'Stack',
  },
];

(async () => {
  try {
    await sequelize.authenticate();
    const created = await Question.bulkCreate(questions);
    console.log(`✓ Inserted ${created.length} MCQ questions:`);
    created.forEach((q) => console.log(`  [${q.section}] ${q.question_text.slice(0, 60)}...`));
  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    await sequelize.close();
  }
})();
