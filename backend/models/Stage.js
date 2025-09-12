module.exports = (sequelize, DataTypes) => {
  const Stage = sequelize.define('Stage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
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
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    color: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '#1F2937', // Default to our gray-800
      validate: {
        is: /^#[0-9A-F]{6}$/i
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'is_active'
    },
    pipelineType: {
      type: DataTypes.ENUM('sales', 'recruiting'),
      defaultValue: 'sales',
      allowNull: false,
      field: 'pipeline_type'
    }
  }, {
    tableName: 'stages',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['order']
      }
    ]
  });

  Stage.associate = function(models) {
    Stage.belongsTo(models.User, { foreignKey: 'userId' });
    Stage.hasMany(models.Deal, { foreignKey: 'stageId' });
  };

  // Method to get default stages for new users
  Stage.getDefaultStages = function() {
    return [
      { name: 'Lead', order: 0, color: '#6B7280', pipelineType: 'sales' },
      { name: 'Qualified', order: 1, color: '#3B82F6', pipelineType: 'sales' },
      { name: 'Proposal', order: 2, color: '#8B5CF6', pipelineType: 'sales' },
      { name: 'Negotiation', order: 3, color: '#F59E0B', pipelineType: 'sales' },
      { name: 'Closed Won', order: 4, color: '#10B981', pipelineType: 'sales' },
      { name: 'Closed Lost', order: 5, color: '#EF4444', pipelineType: 'sales' }
    ];
  };

  // Method to get default recruiting stages
  Stage.getDefaultRecruitingStages = function() {
    return [
      { name: 'Applied/Sourced', order: 0, color: '#6B7280', pipelineType: 'recruiting' },
      { name: 'Phone Screen', order: 1, color: '#3B82F6', pipelineType: 'recruiting' },
      { name: 'Technical Interview', order: 2, color: '#8B5CF6', pipelineType: 'recruiting' },
      { name: 'Culture Fit', order: 3, color: '#F59E0B', pipelineType: 'recruiting' },
      { name: 'Offer Extended', order: 4, color: '#10B981', pipelineType: 'recruiting' },
      { name: 'Hired', order: 5, color: '#059669', pipelineType: 'recruiting' },
      { name: 'Rejected', order: 6, color: '#EF4444', pipelineType: 'recruiting' }
    ];
  };

  return Stage;
};