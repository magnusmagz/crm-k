module.exports = (sequelize, DataTypes) => {
  const AutomationEnrollment = sequelize.define('AutomationEnrollment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    automationId: {
      type: DataTypes.UUID,
      field: 'automation_id',
      allowNull: false,
      references: {
        model: 'automations',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.UUID,
      field: 'user_id',
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    entityType: {
      type: DataTypes.ENUM('contact', 'deal'),
      field: 'entity_type',
      allowNull: false
    },
    entityId: {
      type: DataTypes.UUID,
      field: 'entity_id',
      allowNull: false
    },
    currentStepIndex: {
      type: DataTypes.INTEGER,
      field: 'current_step_index',
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
      field: 'enrolled_at',
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    completedAt: {
      type: DataTypes.DATE,
      field: 'completed_at',
      allowNull: true
    },
    nextStepAt: {
      type: DataTypes.DATE,
      field: 'next_step_at',
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false
    },
    exitReason: {
      type: DataTypes.STRING(255),
      field: 'exit_reason',
      allowNull: true
    },
    exitedAt: {
      type: DataTypes.DATE,
      field: 'exited_at',
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