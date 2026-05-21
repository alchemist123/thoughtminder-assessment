'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('exams', {
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

    await queryInterface.addIndex('exams', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('exams');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_exams_status";');
  },
};
