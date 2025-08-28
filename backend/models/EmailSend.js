module.exports = (sequelize, DataTypes) => {
  const EmailSend = sequelize.define('EmailSend', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    contactId: {
      type: DataTypes.UUID,
      allowNull: true,  // Allow null for system emails (user invites, password resets, etc.)
      references: {
        model: 'contacts',
        key: 'id'
      }
    },
    postmarkMessageId: {
      type: DataTypes.STRING,
      unique: true,
      field: 'postmark_message_id'
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'sent',
      validate: {
        isIn: [['sent', 'bounced', 'delivered', 'failed']]
      }
    },
    trackingId: {
      type: DataTypes.STRING(255),
      unique: true,
      field: 'tracking_id'
    },
    openCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'open_count'
    },
    clickCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'click_count'
    },
    sentAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'sent_at'
    },
    openedAt: {
      type: DataTypes.DATE,
      field: 'opened_at'
    },
    bouncedAt: {
      type: DataTypes.DATE,
      field: 'bounced_at'
    },
    clickedAt: {
      type: DataTypes.DATE,
      field: 'clicked_at'
    },
    lastOpenedAt: {
      type: DataTypes.DATE,
      field: 'last_opened_at'
    },
    unsubscribedAt: {
      type: DataTypes.DATE,
      field: 'unsubscribed_at'
    }
  }, {
    tableName: 'email_sends',
    indexes: [
      {
        fields: ['postmark_message_id']
      },
      {
        fields: ['contact_id']
      },
      {
        fields: ['user_id', 'created_at']
      }
    ]
  });

  EmailSend.associate = (models) => {
    EmailSend.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    EmailSend.belongsTo(models.Contact, {
      foreignKey: 'contact_id',
      as: 'contact'
    });
  };

  return EmailSend;
};