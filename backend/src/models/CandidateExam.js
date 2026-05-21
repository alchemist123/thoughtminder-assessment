'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CandidateExam extends Model {}

  CandidateExam.init(
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
      candidate_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      passcode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      access_link: {
        type: DataTypes.STRING,
      },
      status: {
        type: DataTypes.ENUM('pending', 'started', 'submitted'),
        defaultValue: 'pending',
        allowNull: false,
      },
      started_at: {
        type: DataTypes.DATE,
      },
      submitted_at: {
        type: DataTypes.DATE,
      },
      score: {
        type: DataTypes.DECIMAL(6, 2),
      },
    },
    {
      sequelize,
      modelName: 'CandidateExam',
      tableName: 'candidate_exams',
      underscored: true,
      timestamps: false,
    }
  );

  return CandidateExam;
};
