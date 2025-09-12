const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EmailCampaign = sequelize.define('EmailCampaign', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'organization_id'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'template_id'
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    fromEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'from_email'
    },
    fromName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'from_name'
    },
    replyTo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'reply_to'
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'draft'
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'scheduled_at'
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'sent_at'
    },
    recipientsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'recipients_count'
    },
    sentCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'sent_count'
    },
    openedCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'opened_count'
    },
    clickedCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'clicked_count'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    }
  }, {
    tableName: 'email_campaigns',
    timestamps: true
  });

  return EmailCampaign;
};