module.exports = (sequelize, DataTypes) => {
  const Contact = sequelize.define('Contact', {
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
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      },
      set(value) {
        if (value) {
          this.setDataValue('email', value.toLowerCase());
        }
      }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        is: /^[\d\s\-\+\(\)]+$/i
      }
    },
    company: {
      type: DataTypes.STRING,
      allowNull: true
    },
    position: {
      type: DataTypes.STRING,
      allowNull: true
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    customFields: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false
    }
  }, {
    tableName: 'contacts',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['user_id', 'created_at']
      },
      {
        fields: ['email']
      },
      {
        fields: ['first_name', 'last_name']
      },
      {
        fields: ['tags'],
        using: 'gin'
      },
      {
        fields: ['company']
      },
      {
        fields: ['position']
      }
    ]
  });

  Contact.prototype.getFullName = function() {
    return `${this.firstName} ${this.lastName}`;
  };

  return Contact;
};