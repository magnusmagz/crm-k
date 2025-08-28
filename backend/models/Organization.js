module.exports = (sequelize, DataTypes) => {
  const Organization = sequelize.define('Organization', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    // Branding fields for future multi-tenant features
    crmName: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'CRM Killer',
      field: 'crm_name'
    },
    primaryColor: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#6366f1',
      field: 'primary_color',
      validate: {
        is: /^#[0-9A-F]{6}$/i
      }
    },
    // Organization management fields
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by'
    },
    // Organization settings
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {
        allowUserRegistration: false,
        requireEmailVerification: true,
        defaultUserRole: 'user',
        maxUsers: null,
        features: {
          roundRobin: true,
          emailTemplates: true,
          customFields: true,
          recruiting: true
        }
      }
    },
    // Contact information
    contactEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'contact_email',
      validate: {
        isEmail: true
      }
    },
    contactPhone: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'contact_phone'
    },
    website: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    // Address information
    address: {
      type: DataTypes.STRING,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(2),
      allowNull: true
    },
    zipCode: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'zip_code'
    },
    // Statistics (computed fields, stored for performance)
    userCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'user_count'
    },
    contactCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'contact_count'
    }
  }, {
    tableName: 'organizations',
    timestamps: false, // Disable timestamps for now since columns don't exist
    hooks: {
      beforeValidate: (organization) => {
        // Ensure CRM name defaults to organization name if not set
        if (!organization.crmName && organization.name) {
          organization.crmName = organization.name;
        }
      }
    }
  });

  // Instance methods
  Organization.prototype.updateUserCount = async function() {
    const count = await this.countUsers();
    this.userCount = count;
    await this.save();
    return count;
  };

  Organization.prototype.updateContactCount = async function() {
    const count = await this.countContacts();
    this.contactCount = count;
    await this.save();
    return count;
  };

  Organization.prototype.isWithinUserLimit = async function() {
    if (!this.settings.maxUsers) return true;
    const currentCount = await this.countUsers();
    return currentCount < this.settings.maxUsers;
  };

  // Class methods
  Organization.getActiveOrganizations = function() {
    return this.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']]
    });
  };

  Organization.findByIdWithStats = function(id) {
    return this.findByPk(id, {
      include: [
        {
          model: sequelize.models.User,
          as: 'users',
          attributes: ['id'],
          required: false
        },
        {
          model: sequelize.models.Contact,
          as: 'contacts',
          attributes: ['id'],
          required: false
        }
      ]
    });
  };

  return Organization;
};