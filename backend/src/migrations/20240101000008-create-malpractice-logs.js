'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('malpractice_logs', {
      id: {
        type:         DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey:   true,
        allowNull:    false,
      },
      candidate_exam_id: {
        type:       DataTypes.UUID,
        allowNull:  false,
        references: { model: 'candidate_exams', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE',
      },
      candidate_id: {
        type:       DataTypes.UUID,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE',
      },
      exam_id: {
        type:       DataTypes.UUID,
        allowNull:  false,
        references: { model: 'exams', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE',
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
      created_at: {
        type:         DataTypes.DATE,
        allowNull:    false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type:         DataTypes.DATE,
        allowNull:    false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('malpractice_logs', ['candidate_exam_id']);
    await queryInterface.addIndex('malpractice_logs', ['candidate_id']);
    await queryInterface.addIndex('malpractice_logs', ['exam_id']);
    await queryInterface.addIndex('malpractice_logs', ['type']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('malpractice_logs');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_malpractice_logs_type"'
    );
  },
};
