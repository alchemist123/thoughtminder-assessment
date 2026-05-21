'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('questions', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      section: {
        type: DataTypes.ENUM('quantitative', 'verbal', 'technical', 'coding'),
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('mcq', 'written', 'coding'),
        allowNull: false,
      },
      question_text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      options: {
        type: DataTypes.JSONB,
      },
      correct_answer: {
        type: DataTypes.TEXT,
      },
      boilerplate: {
        type: DataTypes.JSONB,
      },
      sample_input: {
        type: DataTypes.TEXT,
      },
      sample_output: {
        type: DataTypes.TEXT,
      },
      test_cases: {
        type: DataTypes.JSONB,
      },
      difficulty: {
        type: DataTypes.ENUM('easy', 'medium', 'hard'),
        defaultValue: 'medium',
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('questions', ['section']);
    await queryInterface.addIndex('questions', ['type']);
    await queryInterface.addIndex('questions', ['difficulty']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('questions');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_questions_section";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_questions_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_questions_difficulty";');
  },
};
