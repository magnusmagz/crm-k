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
      field: 'user_id', // Now using snake_case in DB
      references: {
        model: 'users',
        key: 'id'
      }
    },
    candidateId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'candidate_id', // Now using snake_case in DB
      references: {
        model: 'contacts',
        key: 'id'
      }
    },
    positionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'position_id', // Now using snake_case in DB
      references: {
        model: 'positions',
        key: 'id'
      }
    },
    stageId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'stage_id', // Now using snake_case in DB
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
      allowNull: true,
      field: 'interview_date' // Now using snake_case in DB
    },
    offerDetails: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      field: 'offer_details' // Now using snake_case in DB
    },
    rejectionReason: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'rejection_reason' // Now using snake_case in DB
    },
    appliedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
      field: 'applied_at' // Now using snake_case in DB
    },
    hiredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'hired_at' // Now using snake_case in DB
    },
    customFields: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false,
      field: 'custom_fields' // Now using snake_case in DB
    }
  }, {
    tableName: 'recruiting_pipeline', // Table renamed to snake_case
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['candidateId']
      },
      {
        fields: ['positionId']
      },
      {
        fields: ['stageId']
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