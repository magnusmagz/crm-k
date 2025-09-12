module.exports = (sequelize, DataTypes) => {
  const AutomationLog = sequelize.define('AutomationLog', {
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
    triggerType: {
      type: DataTypes.STRING,
      field: 'trigger_type',
      allowNull: false
    },
    triggerData: {
      type: DataTypes.JSONB,
      field: 'trigger_data',
      allowNull: false
    },
    conditionsMet: {
      type: DataTypes.BOOLEAN,
      field: 'conditions_met',
      allowNull: false
    },
    conditionsEvaluated: {
      type: DataTypes.JSONB,
      field: 'conditions_evaluated',
      allowNull: true
    },
    actionsExecuted: {
      type: DataTypes.JSONB,
      field: 'actions_executed',
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('success', 'failed', 'skipped'),
      allowNull: false
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    executedAt: {
      type: DataTypes.DATE,
      field: 'executed_at',
      defaultValue: DataTypes.NOW,
      allowNull: false
    }
  }, {
    tableName: 'automation_logs',
    updatedAt: false,
    indexes: [
      {
        fields: ['automation_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['executed_at']
      },
      {
        fields: ['status']
      }
    ]
  });

  AutomationLog.associate = function(models) {
    AutomationLog.belongsTo(models.Automation, { foreignKey: 'automationId' });
    AutomationLog.belongsTo(models.User, { foreignKey: 'userId' });
  };

  return AutomationLog;
};