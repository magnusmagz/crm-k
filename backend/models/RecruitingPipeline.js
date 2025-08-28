module.exports = (sequelize, DataTypes) => {
  const RecruitingPipeline = sequelize.define('RecruitingPipeline', {
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
    candidateId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'contacts',
        key: 'id'
      }
    },
    positionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'positions',
        key: 'id'
      }
    },
    stageId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'stages',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('active', 'hired', 'passed', 'withdrawn'),
      defaultValue: 'active',
      allowNull: false
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    interviewDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    offerDetails: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    rejectionReason: {
      type: DataTypes.STRING,
      allowNull: true
    },
    appliedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    hiredAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    customFields: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false
    }
  }, {
    tableName: 'recruiting_pipeline',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['candidate_id']
      },
      {
        fields: ['position_id']
      },
      {
        fields: ['stage_id']
      },
      {
        fields: ['status']
      }
    ]
  });

  RecruitingPipeline.associate = function(models) {
    RecruitingPipeline.belongsTo(models.User, { foreignKey: 'userId' });
    RecruitingPipeline.belongsTo(models.Contact, { 
      foreignKey: 'candidateId',
      as: 'Candidate'
    });
    RecruitingPipeline.belongsTo(models.Position, { foreignKey: 'positionId' });
    RecruitingPipeline.belongsTo(models.Stage, { foreignKey: 'stageId' });
  };

  return RecruitingPipeline;
};