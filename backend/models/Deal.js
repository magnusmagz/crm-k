module.exports = (sequelize, DataTypes) => {
  const Deal = sequelize.define('Deal', {
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
    contactId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'contact_id',
      references: {
        model: 'contacts',
        key: 'id'
      }
    },
    // TODO: Re-enable after running migrations
    // companyId: {
    //   type: DataTypes.UUID,
    //   allowNull: true,
    //   field: 'company_id',
    //   references: {
    //     model: 'companies',
    //     key: 'id'
    //   }
    // },
    stageId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'stage_id',
      references: {
        model: 'stages',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    status: {
      type: DataTypes.ENUM('open', 'won', 'lost'),
      defaultValue: 'open',
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'closed_at'
    },
    expectedCloseDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expected_close_date'
    },
    customFields: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false,
      field: 'custom_fields'
    }
  }, {
    tableName: 'deals',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['contact_id']
      },
      {
        fields: ['stage_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['contact_id', 'user_id']
      },
      {
        fields: ['user_id', 'status']
      }
    ]
  });

  Deal.associate = function(models) {
    Deal.belongsTo(models.User, { foreignKey: 'userId' });
    Deal.belongsTo(models.Contact, { foreignKey: 'contactId' });
    Deal.belongsTo(models.Stage, { foreignKey: 'stageId' });
  };

  return Deal;
};