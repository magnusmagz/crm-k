module.exports = (sequelize, DataTypes) => {
  const EmailSuppression = sequelize.define('EmailSuppression', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true
      },
      set(value) {
        if (value) {
          this.setDataValue('email', value.toLowerCase());
        }
      }
    },
    userId: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'user_id'
    },
    reason: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['unsubscribe', 'spam_complaint', 'hard_bounce', 'manual']]
      }
    }
  }, {
    tableName: 'email_suppressions',
    indexes: [
      {
        fields: ['email']
      }
    ]
  });

  EmailSuppression.associate = (models) => {
    EmailSuppression.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return EmailSuppression;
};