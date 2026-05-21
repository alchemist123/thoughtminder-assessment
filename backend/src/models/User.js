'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class User extends Model {}

  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('admin', 'candidate'),
        defaultValue: 'candidate',
        allowNull: false,
      },
      stream: {
        type: DataTypes.STRING,
      },
      sgpa: {
        type: DataTypes.DECIMAL(4, 2),
      },
      interested_area: {
        type: DataTypes.STRING,
      },
      batch: {
        type: DataTypes.STRING,
      },
      registration_token: {
        type: DataTypes.STRING,
        unique: true,
      },
      is_registered: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      underscored: true,
      paranoid: true,
    }
  );

  return User;
};
