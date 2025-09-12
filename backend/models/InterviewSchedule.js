const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InterviewSchedule = sequelize.define('InterviewSchedule', {
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
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'scheduled_at'
    },
    duration: {
      type: DataTypes.INTEGER,
      defaultValue: 60
    },
    type: {
      type: DataTypes.STRING(50),
      defaultValue: 'phone'
    },
    location: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    interviewerIds: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: true,
      field: 'interviewer_ids'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'scheduled'
    },
    meetingLink: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'meeting_link'
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
    tableName: 'interview_schedules',
    timestamps: true
  });

  return InterviewSchedule;
};