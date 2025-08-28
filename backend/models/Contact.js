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
        isValidPhone(value) {
          // Allow empty strings and null
          if (!value || value === '') {
            return true;
          }
          // Otherwise validate the phone format
          if (!/^[\d\s\-\+\(\)]+$/i.test(value)) {
            throw new Error('Invalid phone number format');
          }
        }
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
    },
    // Multi-tenant fields
    organizationId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'organizationId'
    },
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'assignedTo'
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'assignedAt'
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true
    },
    contactType: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'contact',
      field: 'contactType'
    },
    // Recruiting-specific fields
    resumeUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'resumeUrl'
    },
    linkedinUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'linkedinUrl'
    },
    githubUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'githubUrl'
    },
    skills: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      allowNull: false
    },
    experienceYears: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'experienceYears'
    },
    salaryExpectation: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      field: 'salaryExpectation'
    },
    availability: {
      type: DataTypes.STRING,
      allowNull: true
    },
    currentEmployer: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'currentEmployer'
    },
    currentRole: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'currentRole'
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
      },
      {
        fields: ['skills'],
        using: 'gin'
      }
    ]
  });

  Contact.prototype.getFullName = function() {
    return `${this.firstName} ${this.lastName}`;
  };

  return Contact;
};