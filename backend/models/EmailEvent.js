module.exports = (sequelize, DataTypes) => {
  const EmailEvent = sequelize.define('EmailEvent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    emailSendId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'email_sends',
        key: 'id'
      },
      field: 'email_send_id'
    },
    eventType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'event_type',
      validate: {
        isIn: [['open', 'click', 'bounce', 'spam_complaint', 'unsubscribe']]
      }
    },
    eventData: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false,
      field: 'event_data'
    },
    ipAddress: {
      type: DataTypes.INET,
      field: 'ip_address'
    },
    userAgent: {
      type: DataTypes.TEXT,
      field: 'user_agent'
    },
    occurredAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
      field: 'occurred_at'
    }
  }, {
    tableName: 'email_events',
    indexes: [
      {
        fields: ['email_send_id']
      },
      {
        fields: ['event_type']
      },
      {
        fields: ['occurred_at']
      }
    ]
  });

  EmailEvent.associate = (models) => {
    EmailEvent.belongsTo(models.EmailSend, {
      foreignKey: 'email_send_id',
      as: 'emailSend'
    });
  };

  return EmailEvent;
};