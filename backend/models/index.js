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
const Deal = require('./Deal')(sequelize, Sequelize.DataTypes);
const Stage = require('./Stage')(sequelize, Sequelize.DataTypes);
const Automation = require('./Automation')(sequelize, Sequelize.DataTypes);
const AutomationLog = require('./AutomationLog')(sequelize, Sequelize.DataTypes);
const AutomationStep = require('./AutomationStep')(sequelize, Sequelize.DataTypes);
const AutomationEnrollment = require('./AutomationEnrollment')(sequelize, Sequelize.DataTypes);

// Define associations
User.hasOne(UserProfile, { foreignKey: 'user_id', as: 'profile' });
UserProfile.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Contact, { foreignKey: 'user_id', as: 'contacts' });
Contact.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(CustomField, { foreignKey: 'user_id', as: 'customFields' });
CustomField.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Deal, { foreignKey: 'user_id', as: 'deals' });
Deal.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Stage, { foreignKey: 'user_id', as: 'stages' });
Stage.belongsTo(User, { foreignKey: 'user_id' });

Contact.hasMany(Deal, { foreignKey: 'contact_id', as: 'deals' });
Deal.belongsTo(Contact, { foreignKey: 'contact_id' });

Stage.hasMany(Deal, { foreignKey: 'stage_id', as: 'deals' });
Deal.belongsTo(Stage, { foreignKey: 'stage_id' });

User.hasMany(Automation, { foreignKey: 'user_id', as: 'automations' });
Automation.belongsTo(User, { foreignKey: 'user_id' });

Automation.hasMany(AutomationLog, { foreignKey: 'automation_id', as: 'logs' });
AutomationLog.belongsTo(Automation, { foreignKey: 'automation_id' });

User.hasMany(AutomationLog, { foreignKey: 'user_id', as: 'automationLogs' });
AutomationLog.belongsTo(User, { foreignKey: 'user_id' });

Automation.hasMany(AutomationStep, { foreignKey: 'automation_id', as: 'steps' });
AutomationStep.belongsTo(Automation, { foreignKey: 'automation_id' });

Automation.hasMany(AutomationEnrollment, { foreignKey: 'automation_id', as: 'enrollments' });
AutomationEnrollment.belongsTo(Automation, { foreignKey: 'automation_id' });

User.hasMany(AutomationEnrollment, { foreignKey: 'user_id', as: 'automationEnrollments' });
AutomationEnrollment.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  sequelize,
  User,
  UserProfile,
  Contact,
  CustomField,
  Deal,
  Stage,
  Automation,
  AutomationLog,
  AutomationStep,
  AutomationEnrollment
};