const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AssignmentRule = sequelize.define('AssignmentRule', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'organization_id'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    conditions: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 100
    },
    assignmentMethod: {
      type: DataTypes.STRING,
      defaultValue: 'round_robin',
      field: 'assignment_method'
    },
    requireStateMatch: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'require_state_match'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    }
  }, {
    tableName: 'assignment_rules',
    timestamps: true
  });

  return AssignmentRule;
};