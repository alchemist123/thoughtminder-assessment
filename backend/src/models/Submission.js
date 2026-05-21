'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Submission extends Model {}

  Submission.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      candidate_exam_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      question_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      answer_text: {
        type: DataTypes.TEXT,
      },
      selected_option: {
        type: DataTypes.STRING,
      },
      code_submission: {
        type: DataTypes.JSONB,
        comment: '{ language, source_code, stdout, stderr, status }',
      },
      is_correct: {
        type: DataTypes.BOOLEAN,
      },
      score: {
        type: DataTypes.DECIMAL(6, 2),
      },
    },
    {
      sequelize,
      modelName: 'Submission',
      tableName: 'submissions',
      underscored: true,
      timestamps: false,
    }
  );

  return Submission;
};
