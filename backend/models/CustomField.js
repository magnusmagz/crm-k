module.exports = (sequelize, DataTypes) => {
  const CustomField = sequelize.define('CustomField', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      field: 'user_id',
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    entityType: {
      type: DataTypes.ENUM('contact', 'deal'),
      field: 'entity_type',
      allowNull: false,
      defaultValue: 'contact'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        is: /^[a-zA-Z0-9_]+$/
      }
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    type: {
      type: DataTypes.ENUM('text', 'textarea', 'number', 'date', 'select', 'checkbox', 'url'),
      allowNull: false
    },
    required: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    options: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      validate: {
        isValidForType(value) {
          if (this.type === 'select' && (!value || value.length === 0)) {
            throw new Error('Select fields must have at least one option');
          }
          if (this.type !== 'select' && value && value.length > 0) {
            throw new Error('Only select fields can have options');
          }
        }
      }
    },
    validation: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'custom_fields',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'entity_type', 'name'],
        name: 'custom_fields_user_entity_name_unique'
      },
      {
        fields: ['user_id', 'entity_type', 'order']
      }
    ]
  });

  return CustomField;
};