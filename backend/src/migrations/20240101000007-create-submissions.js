'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('submissions', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      candidate_exam_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'candidate_exams', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      question_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'questions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      answer_text: {
        type: DataTypes.TEXT,
      },
      selected_option: {
        type: DataTypes.STRING,
      },
      code_submission: {
        type: DataTypes.JSONB,
      },
      is_correct: {
        type: DataTypes.BOOLEAN,
      },
      score: {
        type: DataTypes.DECIMAL(6, 2),
      },
    });

    await queryInterface.addIndex('submissions', ['candidate_exam_id']);
    await queryInterface.addIndex('submissions', ['question_id']);
    await queryInterface.addIndex('submissions', ['candidate_exam_id', 'question_id'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('submissions');
  },
};
