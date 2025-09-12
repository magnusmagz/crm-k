const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      },
      set(value) {
        this.setDataValue('email', value.toLowerCase());
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 100]
      }
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_verified'
    },
    resetToken: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'reset_token'
    },
    resetTokenExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reset_token_expiry'
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login'
    },
    // Multi-tenant fields
    organizationId: {
      type: DataTypes.UUID,
      allowNull: true
      // No field mapping needed - column name matches property name
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      allowNull: true
      // No field mapping needed - column name matches property name
    },
    isLoanOfficer: {
      type: DataTypes.BOOLEAN,
      allowNull: true
      // No field mapping needed - column name matches property name
    },
    licensedStates: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
      // No field mapping needed - column name matches property name
    },
    requirePasswordChange: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
      // No field mapping needed - column name matches property name
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
      // No field mapping needed - column name matches property name
    },
    // Super Admin field for platform-wide access
    isSuperAdmin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_super_admin'
    }
  }, {
    tableName: 'users',
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  User.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.password;
    delete values.resetToken;
    delete values.resetTokenExpiry;
    return values;
  };

  return User;
};