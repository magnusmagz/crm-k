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
        isUrl: {
          msg: 'Website must be a valid URL',
          args: true
        },
        notEmptyString(value) {
          if (value === '') {
            throw new Error('Website cannot be an empty string. Use null instead.');
          }
        }
      },
      set(value) {
        // Convert empty strings to null
        this.setDataValue('website', value === '' ? null : value);
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
        isUrl: {
          msg: 'LinkedIn page must be a valid URL',
          args: true
        }
      },
      set(value) {
        // Convert empty strings to null
        this.setDataValue('linkedinPage', value === '' ? null : value);
      }
    },
    companyLink1: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'company_link_1',
      validate: {
        isUrl: {
          msg: 'Company link 1 must be a valid URL',
          args: true
        }
      },
      set(value) {
        this.setDataValue('companyLink1', value === '' ? null : value);
      }
    },
    companyLink2: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'company_link_2',
      validate: {
        isUrl: {
          msg: 'Company link 2 must be a valid URL',
          args: true
        }
      },
      set(value) {
        this.setDataValue('companyLink2', value === '' ? null : value);
      }
    },
    companyLink3: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'company_link_3',
      validate: {
        isUrl: {
          msg: 'Company link 3 must be a valid URL',
          args: true
        }
      },
      set(value) {
        this.setDataValue('companyLink3', value === '' ? null : value);
      }
    },
    companyLink4: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'company_link_4',
      validate: {
        isUrl: {
          msg: 'Company link 4 must be a valid URL',
          args: true
        }
      },
      set(value) {
        this.setDataValue('companyLink4', value === '' ? null : value);
      }
    },
    companyLink5: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'company_link_5',
      validate: {
        isUrl: {
          msg: 'Company link 5 must be a valid URL',
          args: true
        }
      },
      set(value) {
        this.setDataValue('companyLink5', value === '' ? null : value);
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
