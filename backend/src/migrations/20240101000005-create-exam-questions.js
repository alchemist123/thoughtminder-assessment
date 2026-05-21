'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('exam_questions', {
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
      question_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'questions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      order_index: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    });

    await queryInterface.addIndex('exam_questions', ['exam_id']);
    await queryInterface.addIndex('exam_questions', ['question_id']);
    await queryInterface.addIndex('exam_questions', ['exam_id', 'question_id'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('exam_questions');
  },
};
