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

// Import new models with field mappings
const AssignmentRule = require('./AssignmentRule')(sequelize, Sequelize.DataTypes);
const Assignment = require('./Assignment')(sequelize, Sequelize.DataTypes);
const EmailTemplate = require('./EmailTemplate')(sequelize, Sequelize.DataTypes);
const EmailCampaign = require('./EmailCampaign')(sequelize, Sequelize.DataTypes);
const RoundRobinQueue = require('./RoundRobinQueue')(sequelize, Sequelize.DataTypes);
const InterviewSchedule = require('./InterviewSchedule')(sequelize, Sequelize.DataTypes);
const CandidateEvaluation = require('./CandidateEvaluation')(sequelize, Sequelize.DataTypes);
const Reminder = require('./Reminder')(sequelize, Sequelize.DataTypes);

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
RecruitingPipeline.belongsTo(Contact, { foreignKey: 'candidate_id', as: 'Candidate' });

Position.hasMany(RecruitingPipeline, { foreignKey: 'position_id', as: 'candidates' });
RecruitingPipeline.belongsTo(Position, { foreignKey: 'position_id' });

Stage.hasMany(RecruitingPipeline, { foreignKey: 'stage_id', as: 'recruitingPipelines' });
RecruitingPipeline.belongsTo(Stage, { foreignKey: 'stage_id' });

// Assignment Rule associations
Organization.hasMany(AssignmentRule, { foreignKey: 'organizationId', as: 'assignmentRules' });
AssignmentRule.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

AssignmentRule.hasMany(RoundRobinQueue, { foreignKey: 'ruleId', as: 'queues' });
RoundRobinQueue.belongsTo(AssignmentRule, { foreignKey: 'ruleId', as: 'rule' });

// Assignment associations
Contact.hasMany(Assignment, { foreignKey: 'contactId', as: 'assignments' });
Assignment.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });

User.hasMany(Assignment, { foreignKey: 'assignedTo', as: 'assignmentsReceived' });
Assignment.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedUser' });

User.hasMany(Assignment, { foreignKey: 'assignedBy', as: 'assignmentsMade' });
Assignment.belongsTo(User, { foreignKey: 'assignedBy', as: 'assigner' });

// Round Robin Queue associations
User.hasMany(RoundRobinQueue, { foreignKey: 'userId', as: 'roundRobinQueues' });
RoundRobinQueue.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Email Template associations
Organization.hasMany(EmailTemplate, { foreignKey: 'organizationId', as: 'emailTemplates' });
EmailTemplate.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

User.hasMany(EmailTemplate, { foreignKey: 'createdBy', as: 'createdEmailTemplates' });
EmailTemplate.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(EmailTemplate, { foreignKey: 'updatedBy', as: 'updatedEmailTemplates' });
EmailTemplate.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

// Email Campaign associations
Organization.hasMany(EmailCampaign, { foreignKey: 'organizationId', as: 'emailCampaigns' });
EmailCampaign.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

EmailTemplate.hasMany(EmailCampaign, { foreignKey: 'templateId', as: 'campaigns' });
EmailCampaign.belongsTo(EmailTemplate, { foreignKey: 'templateId', as: 'template' });

User.hasMany(EmailCampaign, { foreignKey: 'createdBy', as: 'createdEmailCampaigns' });
EmailCampaign.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Interview Schedule associations
RecruitingPipeline.hasMany(InterviewSchedule, { foreignKey: 'pipelineId', as: 'interviews' });
InterviewSchedule.belongsTo(RecruitingPipeline, { foreignKey: 'pipelineId', as: 'pipeline' });

// Candidate Evaluation associations
RecruitingPipeline.hasMany(CandidateEvaluation, { foreignKey: 'pipelineId', as: 'evaluations' });
CandidateEvaluation.belongsTo(RecruitingPipeline, { foreignKey: 'pipelineId', as: 'pipeline' });

User.hasMany(CandidateEvaluation, { foreignKey: 'evaluatorId', as: 'evaluations' });
CandidateEvaluation.belongsTo(User, { foreignKey: 'evaluatorId', as: 'evaluator' });

// Reminder associations
User.hasMany(Reminder, { foreignKey: 'userId', as: 'reminders' });
Reminder.belongsTo(User, { foreignKey: 'userId', as: 'user' });

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
  RecruitingPipeline,
  // New models with field mappings
  AssignmentRule,
  Assignment,
  EmailTemplate,
  EmailCampaign,
  RoundRobinQueue,
  InterviewSchedule,
  CandidateEvaluation,
  Reminder
};