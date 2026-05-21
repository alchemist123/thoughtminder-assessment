'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ExamQuestion extends Model {}

  ExamQuestion.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      exam_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      question_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      order_index: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: 'ExamQuestion',
      tableName: 'exam_questions',
      underscored: true,
      timestamps: false,
    }
  );

  return ExamQuestion;
};
