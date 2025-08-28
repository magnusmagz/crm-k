'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create organizations table
    await queryInterface.createTable('organizations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add organization_id and isAdmin to users table
    await queryInterface.addColumn('users', 'organizationId', {
      type: Sequelize.UUID,
      references: {
        model: 'organizations',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('users', 'isAdmin', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });

    await queryInterface.addColumn('users', 'isLoanOfficer', {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    });

    await queryInterface.addColumn('users', 'licensedStates', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      defaultValue: []
    });

    // Add assignment fields to contacts
    await queryInterface.addColumn('contacts', 'assignedTo', {
      type: Sequelize.UUID,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('contacts', 'assignedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('contacts', 'organizationId', {
      type: Sequelize.UUID,
      references: {
        model: 'organizations',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('contacts', 'source', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('contacts', 'state', {
      type: Sequelize.STRING(2),
      allowNull: true
    });

    await queryInterface.addColumn('contacts', 'contactType', {
      type: Sequelize.STRING,
      defaultValue: 'lead'
    });

    // Create assignments tracking table
    await queryInterface.createTable('assignments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      contactId: {
        type: Sequelize.UUID,
        references: {
          model: 'contacts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        allowNull: false
      },
      assignedTo: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        allowNull: false
      },
      assignedBy: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      assignedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: 'pending'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create assignment_rules table for round-robin
    await queryInterface.createTable('assignment_rules', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      organizationId: {
        type: Sequelize.UUID,
        references: {
          model: 'organizations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      conditions: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 100
      },
      assignmentMethod: {
        type: Sequelize.STRING,
        defaultValue: 'round_robin'
      },
      requireStateMatch: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create round_robin_queues for tracking rotation
    await queryInterface.createTable('round_robin_queues', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      ruleId: {
        type: Sequelize.UUID,
        references: {
          model: 'assignment_rules',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        allowNull: false
      },
      userId: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        allowNull: false
      },
      lastAssignedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      assignmentCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('users', ['organizationId']);
    await queryInterface.addIndex('contacts', ['organizationId']);
    await queryInterface.addIndex('contacts', ['assignedTo']);
    await queryInterface.addIndex('assignments', ['contactId']);
    await queryInterface.addIndex('assignments', ['assignedTo']);
    await queryInterface.addIndex('assignment_rules', ['organizationId']);
    await queryInterface.addIndex('round_robin_queues', ['ruleId', 'userId']);

    console.log('✅ Multi-user organization structure created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('round_robin_queues', ['ruleId', 'userId']);
    await queryInterface.removeIndex('assignment_rules', ['organizationId']);
    await queryInterface.removeIndex('assignments', ['assignedTo']);
    await queryInterface.removeIndex('assignments', ['contactId']);
    await queryInterface.removeIndex('contacts', ['assignedTo']);
    await queryInterface.removeIndex('contacts', ['organizationId']);
    await queryInterface.removeIndex('users', ['organizationId']);

    // Drop tables
    await queryInterface.dropTable('round_robin_queues');
    await queryInterface.dropTable('assignment_rules');
    await queryInterface.dropTable('assignments');

    // Remove columns
    await queryInterface.removeColumn('contacts', 'contactType');
    await queryInterface.removeColumn('contacts', 'state');
    await queryInterface.removeColumn('contacts', 'source');
    await queryInterface.removeColumn('contacts', 'organizationId');
    await queryInterface.removeColumn('contacts', 'assignedAt');
    await queryInterface.removeColumn('contacts', 'assignedTo');
    await queryInterface.removeColumn('users', 'licensedStates');
    await queryInterface.removeColumn('users', 'isLoanOfficer');
    await queryInterface.removeColumn('users', 'isAdmin');
    await queryInterface.removeColumn('users', 'organizationId');

    // Drop organizations table
    await queryInterface.dropTable('organizations');
  }
};