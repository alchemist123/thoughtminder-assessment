'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Exam extends Model {}

  Exam.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('draft', 'active', 'completed'),
        defaultValue: 'draft',
        allowNull: false,
      },
      start_time: {
        type: DataTypes.DATE,
      },
      end_time: {
        type: DataTypes.DATE,
      },
      duration_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      sections: {
        type: DataTypes.JSONB,
        comment: 'Array of section names included in this exam',
      },
    },
    {
      sequelize,
      modelName: 'Exam',
      tableName: 'exams',
      underscored: true,
      paranoid: true,
    }
  );

  return Exam;
};
