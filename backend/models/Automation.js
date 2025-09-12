module.exports = (sequelize, DataTypes) => {
  const Automation = sequelize.define('Automation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    trigger: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        isValidTrigger(value) {
          const validTriggers = [
            'contact_created',
            'contact_updated',
            'deal_created',
            'deal_updated',
            'deal_stage_changed'
          ];
          if (!value.type || !validTriggers.includes(value.type)) {
            throw new Error('Invalid trigger type');
          }
        }
      }
    },
    conditions: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: false
    },
    actions: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        notEmpty(value) {
          if (!Array.isArray(value) || value.length === 0) {
            throw new Error('At least one action is required');
          }
        }
      }
    },
    isMultiStep: {
      type: DataTypes.BOOLEAN,
      field: 'is_multi_step',
      defaultValue: false,
      allowNull: false
    },
    enrolledCount: {
      type: DataTypes.INTEGER,
      field: 'enrolled_count',
      defaultValue: 0,
      allowNull: false
    },
    activeEnrollments: {
      type: DataTypes.INTEGER,
      field: 'active_enrollments',
      defaultValue: 0,
      allowNull: false
    },
    completedEnrollments: {
      type: DataTypes.INTEGER,
      field: 'completed_enrollments',
      defaultValue: 0,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      field: 'is_active',
      defaultValue: true,
      allowNull: false
    },
    executionCount: {
      type: DataTypes.INTEGER,
      field: 'execution_count',
      defaultValue: 0,
      allowNull: false
    },
    lastExecutedAt: {
      type: DataTypes.DATE,
      field: 'last_executed_at',
      allowNull: true
    },
    exitCriteria: {
      type: DataTypes.JSONB,
      field: 'exit_criteria',
      defaultValue: {},
      allowNull: false
    },
    maxDurationDays: {
      type: DataTypes.INTEGER,
      field: 'max_duration_days',
      allowNull: true
    },
    safetyExitEnabled: {
      type: DataTypes.BOOLEAN,
      field: 'safety_exit_enabled',
      defaultValue: true,
      allowNull: false
    }
  }, {
    tableName: 'automations',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['trigger'],
        using: 'gin'
      }
    ]
  });

  Automation.associate = function(models) {
    Automation.belongsTo(models.User, { foreignKey: 'userId' });
    Automation.hasMany(models.AutomationLog, { foreignKey: 'automationId', as: 'logs' });
    Automation.hasMany(models.AutomationStep, { foreignKey: 'automationId', as: 'steps' });
    Automation.hasMany(models.AutomationEnrollment, { foreignKey: 'automationId', as: 'enrollments' });
  };

  return Automation;
};