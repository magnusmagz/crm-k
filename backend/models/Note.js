module.exports = (sequelize, DataTypes) => {
  const Note = sequelize.define('Note', {
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
    contactId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'contacts',
        key: 'id'
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_pinned'
    },
    activities: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: true
    }
  }, {
    tableName: 'notes',
    indexes: [
      {
        fields: ['contact_id', 'created_at']
      },
      {
        fields: ['user_id']
      }
    ]
  });

  Note.associate = (models) => {
    Note.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    Note.belongsTo(models.Contact, {
      foreignKey: 'contactId',
      as: 'contact'
    });
  };

  return Note;
};