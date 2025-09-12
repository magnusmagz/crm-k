module.exports = (sequelize, DataTypes) => {
  const Position = sequelize.define('Position', {
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
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('full-time', 'part-time', 'contract', 'internship'),
      defaultValue: 'full-time',
      allowNull: false
    },
    remote: {
      type: DataTypes.ENUM('onsite', 'remote', 'hybrid'),
      defaultValue: 'onsite',
      allowNull: false
    },
    salaryRange: {
      type: DataTypes.JSONB,
      field: 'salary_range',
      allowNull: true,
      defaultValue: {}
    },
    requirements: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('open', 'closed', 'on-hold'),
      defaultValue: 'open',
      allowNull: false
    },
    customFields: {
      type: DataTypes.JSONB,
      field: 'custom_fields',
      defaultValue: {},
      allowNull: false
    }
  }, {
    tableName: 'positions',
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['title']
      }
    ]
  });

  Position.associate = function(models) {
    Position.belongsTo(models.User, { foreignKey: 'userId' });
    Position.hasMany(models.RecruitingPipeline, { 
      foreignKey: 'positionId',
      as: 'candidates'
    });
  };

  return Position;
};