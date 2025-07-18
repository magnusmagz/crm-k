const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(dbConfig.url, {
  ...dbConfig,
  define: {
    timestamps: true,
    underscored: true
  }
});

// Import models
const User = require('./User')(sequelize, Sequelize.DataTypes);
const UserProfile = require('./UserProfile')(sequelize, Sequelize.DataTypes);
const Contact = require('./Contact')(sequelize, Sequelize.DataTypes);
const CustomField = require('./CustomField')(sequelize, Sequelize.DataTypes);

// Define associations
User.hasOne(UserProfile, { foreignKey: 'user_id', as: 'profile' });
UserProfile.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Contact, { foreignKey: 'user_id', as: 'contacts' });
Contact.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(CustomField, { foreignKey: 'user_id', as: 'customFields' });
CustomField.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  sequelize,
  User,
  UserProfile,
  Contact,
  CustomField
};