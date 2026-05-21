'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Question extends Model {}

  Question.init(
    {
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
        comment: 'Array of option strings for MCQ questions',
      },
      correct_answer: {
        type: DataTypes.TEXT,
      },
      boilerplate: {
        type: DataTypes.JSONB,
        comment: '{ python: "", javascript: "", cpp: "" }',
      },
      sample_input: {
        type: DataTypes.TEXT,
      },
      sample_output: {
        type: DataTypes.TEXT,
      },
      test_cases: {
        type: DataTypes.JSONB,
        comment: 'Array of { input, expected_output }',
      },
      difficulty: {
        type: DataTypes.ENUM('easy', 'medium', 'hard'),
        defaultValue: 'medium',
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Question',
      tableName: 'questions',
      underscored: true,
    }
  );

  return Question;
};
