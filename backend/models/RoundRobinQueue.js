const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RoundRobinQueue = sequelize.define('RoundRobinQueue', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    ruleId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'rule_id'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id'
    },
    assignmentCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'assignment_count'
    },
    lastAssignedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_assigned_at'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
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
    tableName: 'round_robin_queues',
    timestamps: true
  });

  return RoundRobinQueue;
};