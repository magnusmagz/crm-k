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
const Organization = require('./Organization')(sequelize, Sequelize.DataTypes);
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
const EmailSend = require('./EmailSend')(sequelize, Sequelize.DataTypes);
const EmailEvent = require('./EmailEvent')(sequelize, Sequelize.DataTypes);
const EmailLink = require('./EmailLink')(sequelize, Sequelize.DataTypes);
const EmailSuppression = require('./EmailSuppression')(sequelize, Sequelize.DataTypes);
const Note = require('./Note')(sequelize, Sequelize.DataTypes);
const Position = require('./Position')(sequelize, Sequelize.DataTypes);
const RecruitingPipeline = require('./RecruitingPipeline')(sequelize, Sequelize.DataTypes);

// Define associations
// Organization associations
Organization.hasMany(User, { foreignKey: 'organizationId', as: 'users' });
User.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

Organization.hasMany(Contact, { foreignKey: 'organizationId', as: 'contacts' });
Contact.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

// User associations
User.hasOne(UserProfile, { foreignKey: 'user_id', as: 'profile' });
UserProfile.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Contact, { foreignKey: 'user_id', as: 'contacts' });
Contact.belongsTo(User, { foreignKey: 'user_id' });

// Assignment relationship - who the contact is assigned to
Contact.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedUser' });
User.hasMany(Contact, { foreignKey: 'assignedTo', as: 'assignedContacts' });

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

User.hasMany(EmailSend, { foreignKey: 'user_id', as: 'emailSends' });
EmailSend.belongsTo(User, { foreignKey: 'user_id' });

Contact.hasMany(EmailSend, { foreignKey: 'contact_id', as: 'emailSends' });
EmailSend.belongsTo(Contact, { foreignKey: 'contact_id' });

EmailSend.hasMany(EmailEvent, { foreignKey: 'email_send_id', as: 'events' });
EmailEvent.belongsTo(EmailSend, { foreignKey: 'email_send_id' });

EmailSend.hasMany(EmailLink, { foreignKey: 'email_send_id', as: 'links' });
EmailLink.belongsTo(EmailSend, { foreignKey: 'email_send_id' });

User.hasMany(EmailSuppression, { foreignKey: 'user_id', as: 'emailSuppressions' });
EmailSuppression.belongsTo(User, { foreignKey: 'user_id' });

// Note associations
User.hasMany(Note, { foreignKey: 'user_id', as: 'userNotes' });
Note.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Contact.hasMany(Note, { foreignKey: 'contact_id', as: 'contactNotes' });
Note.belongsTo(Contact, { foreignKey: 'contact_id', as: 'contact' });

// Position associations
User.hasMany(Position, { foreignKey: 'user_id', as: 'positions' });
Position.belongsTo(User, { foreignKey: 'user_id' });

// RecruitingPipeline associations
User.hasMany(RecruitingPipeline, { foreignKey: 'user_id', as: 'recruitingPipelines' });
RecruitingPipeline.belongsTo(User, { foreignKey: 'user_id' });

Contact.hasMany(RecruitingPipeline, { foreignKey: 'candidate_id', as: 'applications' });
RecruitingPipeline.belongsTo(Contact, { foreignKey: 'candidate_id', as: 'candidate' });

Position.hasMany(RecruitingPipeline, { foreignKey: 'position_id', as: 'candidates' });
RecruitingPipeline.belongsTo(Position, { foreignKey: 'position_id' });

Stage.hasMany(RecruitingPipeline, { foreignKey: 'stage_id', as: 'recruitingPipelines' });
RecruitingPipeline.belongsTo(Stage, { foreignKey: 'stage_id' });

module.exports = {
  sequelize,
  Organization,
  User,
  UserProfile,
  Contact,
  CustomField,
  Deal,
  Stage,
  Automation,
  AutomationLog,
  AutomationStep,
  AutomationEnrollment,
  EmailSend,
  EmailEvent,
  EmailLink,
  EmailSuppression,
  Note,
  Position,
  RecruitingPipeline
};