'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class RegistrationLink extends Model {}

  RegistrationLink.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      token: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      expires_at: {
        type: DataTypes.DATE,
      },
      usage_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'RegistrationLink',
      tableName: 'registration_links',
      underscored: true,
    }
  );

  return RegistrationLink;
};
