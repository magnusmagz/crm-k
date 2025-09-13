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
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'first_name',
      validate: {
        notEmpty: true
      }
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'last_name',
      validate: {
        notEmpty: true
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'company_name'
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
      field: 'profile_photo',
      comment: 'Base64 encoded profile photo'
    },
    companyLogo: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'company_logo',
      comment: 'Base64 encoded company logo'
    },
    primaryColor: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'primary_color',
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
      field: 'crm_name',
      defaultValue: 'CRM Killer',
      validate: {
        len: [1, 50]
      }
    },
    emailSignature: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'email_signature',
      defaultValue: {
        enabled: false,
        layout: 'modern',
        includePhoto: true,
        includeLogo: true,
        includeSocial: true,
        photoUrl: null,
        logoUrl: null,
        fields: {
          name: { show: true, value: '' },
          title: { show: true, value: '' },
          email: { show: true, value: '' },
          phone: { show: true, value: '' },
          company: { show: true, value: '' },
          address: { show: true, value: '' }
        },
        social: {
          linkedin: { show: false, url: '' },
          twitter: { show: false, url: '' },
          facebook: { show: false, url: '' },
          instagram: { show: false, url: '' },
          website: { show: false, url: '' }
        },
        style: {
          primaryColor: '#1f2937',
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          spacing: 'normal',
          dividerStyle: 'none'
        },
        customHtml: null
      },
      field: 'email_signature'
    },
    nmlsId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'nmls_id',
      validate: {
        isValidNmlsId(value) {
          if (value && value.trim() !== '') {
            // NMLS IDs are typically numeric but stored as string
            if (!/^\d+$/.test(value)) {
              throw new Error('NMLS ID must contain only numbers');
            }
          }
        }
      }
    },
    stateLicenses: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      field: 'state_licenses',
      validate: {
        isValidStateLicenses(value) {
          if (value && Array.isArray(value)) {
            const validStates = [
              'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
              'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
              'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
              'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
              'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
            ];
            
            const seenStates = new Set();
            
            for (const license of value) {
              if (!license.state || !license.licenseNumber) {
                throw new Error('Each license must have a state and license number');
              }
              
              if (!validStates.includes(license.state)) {
                throw new Error(`Invalid state code: ${license.state}`);
              }
              
              if (seenStates.has(license.state)) {
                throw new Error(`Duplicate state license: ${license.state}`);
              }
              
              seenStates.add(license.state);
            }
          }
        }
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