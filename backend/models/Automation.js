module.exports = (sequelize, DataTypes) => {
  const Automation = sequelize.define('Automation', {
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
      defaultValue: false,
      allowNull: false
    },
    enrolledCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    activeEnrollments: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    completedEnrollments: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    executionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    lastExecutedAt: {
      type: DataTypes.DATE,
      allowNull: true
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