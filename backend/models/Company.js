module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define('Company', {
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
      },
      field: 'user_id'
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'organizations',
        key: 'id'
      },
      field: 'organization_id'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true
    },
    address2: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'address_2'
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true
    },
    zip: {
      type: DataTypes.STRING,
      allowNull: true
    },
    website: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    license: {
      type: DataTypes.STRING,
      allowNull: true
    },
    linkedinPage: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'linkedin_page',
      validate: {
        isUrl: true
      }
    },
    companyLink1: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'company_link_1',
      validate: {
        isUrl: true
      }
    },
    companyLink2: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'company_link_2',
      validate: {
        isUrl: true
      }
    },
    companyLink3: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'company_link_3',
      validate: {
        isUrl: true
      }
    },
    companyLink4: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'company_link_4',
      validate: {
        isUrl: true
      }
    },
    companyLink5: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'company_link_5',
      validate: {
        isUrl: true
      }
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
    tableName: 'companies',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['organization_id']
      },
      {
        fields: ['name']
      },
      {
        fields: ['user_id', 'created_at']
      }
    ]
  });

  return Company;
};
