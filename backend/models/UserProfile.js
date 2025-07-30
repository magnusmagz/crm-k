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
        isValidPhone(value) {
          if (value && value.trim() !== '') {
            if (!/^[\d\s\-\+\(\)]+$/i.test(value)) {
              throw new Error('Invalid phone number format');
            }
          }
        }
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
        isValidUrl(value) {
          if (value && value.trim() !== '') {
            // Simple URL validation
            const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
            if (!urlPattern.test(value)) {
              throw new Error('Invalid URL format');
            }
          }
        }
      }
    },
    profilePhoto: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Base64 encoded profile photo'
    },
    companyLogo: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Base64 encoded company logo'
    },
    primaryColor: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '#1f2937',
      validate: {
        isValidHexColor(value) {
          if (value && value.trim() !== '') {
            if (!/^#[0-9A-Fa-f]{6}$/i.test(value)) {
              throw new Error('Invalid hex color format');
            }
          }
        }
      }
    },
    crmName: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'CRM Killer',
      validate: {
        len: [1, 50]
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