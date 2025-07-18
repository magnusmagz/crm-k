module.exports = (sequelize, DataTypes) => {
  const UserProfile = sequelize.define('UserProfile', {
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
    companyName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        is: /^[\d\s\-\+\(\)]+$/i
      }
    },
    address: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      validate: {
        isValidAddress(value) {
          if (value && typeof value === 'object') {
            const allowedKeys = ['street', 'city', 'state', 'zipCode'];
            const keys = Object.keys(value);
            const hasValidKeys = keys.every(key => allowedKeys.includes(key));
            if (!hasValidKeys) {
              throw new Error('Invalid address format');
            }
          }
        }
      }
    },
    website: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    }
  }, {
    tableName: 'user_profiles',
    indexes: [
      {
        unique: true,
        fields: ['user_id']
      }
    ]
  });

  return UserProfile;
};