'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class MalpracticeLog extends Model {}

  MalpracticeLog.init(
    {
      id: {
        type:         DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey:   true,
        allowNull:    false,
      },
      candidate_exam_id: {
        type:      DataTypes.UUID,
        allowNull: false,
      },
      candidate_id: {
        type:      DataTypes.UUID,
        allowNull: false,
      },
      exam_id: {
        type:      DataTypes.UUID,
        allowNull: false,
      },
      type: {
        type:      DataTypes.ENUM('tab_switch', 'multiple_faces', 'no_face', 'camera_blocked'),
        allowNull: false,
      },
      snapshot_base64: {
        type: DataTypes.TEXT,
      },
      snapshot_mime: {
        type:         DataTypes.STRING,
        defaultValue: 'image/jpeg',
      },
      detected_faces: {
        type: DataTypes.INTEGER,
      },
      metadata: {
        type: DataTypes.JSONB,
      },
      occurred_at: {
        type:         DataTypes.DATE,
        allowNull:    false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName:  'MalpracticeLog',
      tableName:  'malpractice_logs',
      underscored: true,
      timestamps:  true,
    }
  );

  return MalpracticeLog;
};
