const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CandidateEvaluation = sequelize.define('CandidateEvaluation', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    pipelineId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'pipeline_id'
    },
    evaluatorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'evaluator_id'
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    strengths: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    weaknesses: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    technicalSkills: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'technical_skills',
      validate: {
        min: 1,
        max: 5
      }
    },
    communicationSkills: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'communication_skills',
      validate: {
        min: 1,
        max: 5
      }
    },
    cultureFit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'culture_fit',
      validate: {
        min: 1,
        max: 5
      }
    },
    recommendation: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
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
    tableName: 'candidate_evaluations',
    timestamps: true
  });

  return CandidateEvaluation;
};