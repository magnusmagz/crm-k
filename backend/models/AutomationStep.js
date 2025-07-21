module.exports = (sequelize, DataTypes) => {
  const AutomationStep = sequelize.define('AutomationStep', {
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
    stepIndex: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('action', 'delay', 'condition', 'branch'),
      allowNull: false
    },
    config: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    conditions: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: false
    },
    actions: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: false
    },
    delayConfig: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    branchConfig: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    nextStepIndex: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    branchStepIndices: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false
    }
  }, {
    tableName: 'automation_steps',
    indexes: [
      {
        fields: ['automation_id', 'step_index'],
        unique: true
      }
    ]
  });

  AutomationStep.associate = function(models) {
    AutomationStep.belongsTo(models.Automation, { foreignKey: 'automationId' });
  };

  return AutomationStep;
};