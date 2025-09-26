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
      field: 'organization_id' // Now using snake_case in DB
    },
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'assigned_to' // Now using snake_case in DB
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'assigned_at' // Now using snake_case in DB
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lastContactedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_contacted_at'
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true
    },
    contactType: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'contact',
      field: 'contact_type' // Now using snake_case in DB
    },
    // Recruiting-specific fields
    resumeUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'resume_url' // Now using snake_case in DB
    },
    linkedinUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'linkedin_url' // Now using snake_case in DB
    },
    githubUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'github_url' // Now using snake_case in DB
    },
    skills: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      allowNull: false
    },
    experienceYears: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'experience_years' // Now using snake_case in DB
    },
    salaryExpectation: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      field: 'salary_expectation' // Now using snake_case in DB
    },
    availability: {
      type: DataTypes.STRING,
      allowNull: true
    },
    currentEmployer: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'current_employer' // Now using snake_case in DB
    },
    currentRole: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'current_role' // Now using snake_case in DB
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