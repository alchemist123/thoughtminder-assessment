'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('candidate_exams', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      exam_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'exams', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      candidate_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
    });

    await queryInterface.addIndex('candidate_exams', ['exam_id']);
    await queryInterface.addIndex('candidate_exams', ['candidate_id']);
    await queryInterface.addIndex('candidate_exams', ['passcode'], { unique: true });
    await queryInterface.addIndex('candidate_exams', ['exam_id', 'candidate_id'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('candidate_exams');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_candidate_exams_status";');
  },
};
