module.exports = (sequelize, DataTypes) => {
  const EmailLink = sequelize.define('EmailLink', {
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
    linkId: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
      field: 'link_id'
    },
    originalUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'original_url'
    },
    clickCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      field: 'click_count'
    },
    firstClickedAt: {
      type: DataTypes.DATE,
      field: 'first_clicked_at'
    },
    lastClickedAt: {
      type: DataTypes.DATE,
      field: 'last_clicked_at'
    }
  }, {
    tableName: 'email_links',
    indexes: [
      {
        fields: ['link_id']
      },
      {
        fields: ['email_send_id']
      }
    ]
  });

  EmailLink.associate = (models) => {
    EmailLink.belongsTo(models.EmailSend, {
      foreignKey: 'email_send_id',
      as: 'emailSend'
    });
  };

  return EmailLink;
};