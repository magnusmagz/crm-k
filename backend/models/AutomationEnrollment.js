module.exports = (sequelize, DataTypes) => {
  const AutomationEnrollment = sequelize.define('AutomationEnrollment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    automationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'automations',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    entityType: {
      type: DataTypes.ENUM('contact', 'deal'),
      allowNull: false
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    currentStepIndex: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'failed', 'unenrolled', 'exited'),
      defaultValue: 'active',
      allowNull: false
    },
    enrolledAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    nextStepAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false
    },
    exitReason: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    exitedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'automation_enrollments',
    indexes: [
      {
        fields: ['automation_id', 'entity_type', 'entity_id'],
        unique: true
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['next_step_at']
      }
    ]
  });

  AutomationEnrollment.associate = function(models) {
    AutomationEnrollment.belongsTo(models.Automation, { foreignKey: 'automationId' });
    AutomationEnrollment.belongsTo(models.User, { foreignKey: 'userId' });
  };

  return AutomationEnrollment;
};