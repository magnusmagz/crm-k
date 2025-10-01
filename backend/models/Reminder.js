module.exports = (sequelize, DataTypes) => {
  const Reminder = sequelize.define('Reminder', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
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
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    remindAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'remind_at',
      validate: {
        isDate: true,
        isAfter: new Date().toISOString() // Must be in the future
      }
    },
    entityType: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'entity_type',
      validate: {
        isIn: [['contact', 'deal']]
      }
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'entity_id'
    },
    entityName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'entity_name'
    },
    isCompleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_completed'
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at'
    },
    lastNotificationSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_notification_sent_at'
    }
  }, {
    tableName: 'reminders',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['user_id', 'remind_at'],
        name: 'idx_reminders_user_remind_at',
        where: {
          is_completed: false
        }
      },
      {
        fields: ['entity_type', 'entity_id'],
        name: 'idx_reminders_entity'
      },
      {
        fields: ['is_completed', 'remind_at'],
        name: 'idx_reminders_pending'
      }
    ]
  });

  // Instance methods
  Reminder.prototype.markCompleted = function() {
    this.isCompleted = true;
    this.completedAt = new Date();
    return this.save();
  };

  Reminder.prototype.markIncomplete = function() {
    this.isCompleted = false;
    this.completedAt = null;
    return this.save();
  };

  Reminder.prototype.isDue = function() {
    return new Date() >= this.remindAt && !this.isCompleted;
  };

  // Class methods
  Reminder.findDueReminders = function(userId) {
    return this.findAll({
      where: {
        userId: userId,
        isCompleted: false,
        remindAt: {
          [sequelize.Sequelize.Op.lte]: new Date()
        }
      },
      order: [['remindAt', 'ASC']]
    });
  };

  Reminder.findPendingReminders = function(userId) {
    return this.findAll({
      where: {
        userId: userId,
        isCompleted: false
      },
      order: [['remindAt', 'ASC']]
    });
  };

  return Reminder;
};