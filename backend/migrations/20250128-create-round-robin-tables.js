'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create assignment_rules table
    await queryInterface.createTable('assignment_rules', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'organization_id'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 100
      },
      conditions: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      assignmentMethod: {
        type: Sequelize.ENUM('round_robin', 'weighted', 'availability'),
        defaultValue: 'round_robin',
        field: 'assignmentMethod'
      },
      requireStateMatch: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        field: 'requireStateMatch'
      },
      activeHoursStart: {
        type: Sequelize.TIME,
        allowNull: true,
        field: 'activeHoursStart'
      },
      activeHoursEnd: {
        type: Sequelize.TIME,
        allowNull: true,
        field: 'activeHoursEnd'
      },
      timezone: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'createdAt'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updatedAt'
      }
    });

    // 2. Create assignments table
    await queryInterface.createTable('assignments', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      contactId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'contacts',
          key: 'id'
        },
        field: 'contactId'
      },
      assignedTo: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        field: 'assignedTo'
      },
      assignedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        field: 'assignedBy'
      },
      ruleId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'assignment_rules',
          key: 'id'
        },
        field: 'ruleId'
      },
      assignmentMethod: {
        type: Sequelize.STRING(50),
        allowNull: true,
        field: 'assignmentMethod'
      },
      assignedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'assignedAt'
      },
      firstContactAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'firstContactAt'
      },
      status: {
        type: Sequelize.ENUM('pending', 'contacted', 'no_answer', 'converted', 'lost'),
        defaultValue: 'pending'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'createdAt'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updatedAt'
      }
    });

    // 3. Create round_robin_queues table
    await queryInterface.createTable('round_robin_queues', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      ruleId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'assignment_rules',
          key: 'id'
        },
        onDelete: 'CASCADE',
        field: 'ruleId'
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        field: 'userId'
      },
      lastAssignedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'lastAssignedAt'
      },
      assignmentCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'assignmentCount'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
      },
      weight: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'createdAt'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updatedAt'
      }
    });

    // 4. Create assignment_activities table
    await queryInterface.createTable('assignment_activities', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      assignmentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'assignments',
          key: 'id'
        },
        onDelete: 'CASCADE',
        field: 'assignmentId'
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        field: 'userId'
      },
      activityType: {
        type: Sequelize.ENUM('call', 'text', 'email', 'note', 'meeting'),
        allowNull: false,
        field: 'activityType'
      },
      outcome: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'createdAt'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updatedAt'
      }
    });

    // 5. Update contacts table - add assignment-related fields if they don't exist
    const contactColumns = await queryInterface.describeTable('contacts');
    
    if (!contactColumns.assignmentId) {
      await queryInterface.addColumn('contacts', 'assignmentId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'assignments',
          key: 'id'
        }
      });
    }

    if (!contactColumns.assignmentStatus) {
      await queryInterface.addColumn('contacts', 'assignmentStatus', {
        type: Sequelize.STRING(50),
        allowNull: true
      });
    }

    if (!contactColumns.assignedTo) {
      await queryInterface.addColumn('contacts', 'assignedTo', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      });
    }

    if (!contactColumns.assignedAt) {
      await queryInterface.addColumn('contacts', 'assignedAt', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    if (!contactColumns.source) {
      await queryInterface.addColumn('contacts', 'source', {
        type: Sequelize.STRING(100),
        allowNull: true
      });
    }

    if (!contactColumns.state) {
      await queryInterface.addColumn('contacts', 'state', {
        type: Sequelize.STRING(2),
        allowNull: true
      });
    }

    // 6. Update users table - add licensedStates if it doesn't exist
    const userColumns = await queryInterface.describeTable('users');
    
    if (!userColumns.licensed_states) {
      await queryInterface.addColumn('users', 'licensed_states', {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: []
      });
    }

    // Create indexes for better performance
    await queryInterface.addIndex('assignments', ['contactId']);
    await queryInterface.addIndex('assignments', ['assignedTo']);
    await queryInterface.addIndex('assignments', ['assignedAt']);
    await queryInterface.addIndex('assignment_activities', ['assignmentId']);
    await queryInterface.addIndex('round_robin_queues', ['ruleId', 'userId'], { unique: true });
    await queryInterface.addIndex('assignment_rules', ['organization_id', 'is_active']);
    await queryInterface.addIndex('contacts', ['assignedTo']);
    await queryInterface.addIndex('contacts', ['assignmentId']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('contacts', ['assignmentId']);
    await queryInterface.removeIndex('contacts', ['assignedTo']);
    await queryInterface.removeIndex('assignment_rules', ['organization_id', 'is_active']);
    await queryInterface.removeIndex('round_robin_queues', ['ruleId', 'userId']);
    await queryInterface.removeIndex('assignment_activities', ['assignmentId']);
    await queryInterface.removeIndex('assignments', ['assignedAt']);
    await queryInterface.removeIndex('assignments', ['assignedTo']);
    await queryInterface.removeIndex('assignments', ['contactId']);

    // Remove columns from existing tables
    const contactColumns = await queryInterface.describeTable('contacts');
    if (contactColumns.state) {
      await queryInterface.removeColumn('contacts', 'state');
    }
    if (contactColumns.source) {
      await queryInterface.removeColumn('contacts', 'source');
    }
    if (contactColumns.assignedAt) {
      await queryInterface.removeColumn('contacts', 'assignedAt');
    }
    if (contactColumns.assignedTo) {
      await queryInterface.removeColumn('contacts', 'assignedTo');
    }
    if (contactColumns.assignmentStatus) {
      await queryInterface.removeColumn('contacts', 'assignmentStatus');
    }
    if (contactColumns.assignmentId) {
      await queryInterface.removeColumn('contacts', 'assignmentId');
    }

    const userColumns = await queryInterface.describeTable('users');
    if (userColumns.licensed_states) {
      await queryInterface.removeColumn('users', 'licensed_states');
    }

    // Drop tables
    await queryInterface.dropTable('assignment_activities');
    await queryInterface.dropTable('round_robin_queues');
    await queryInterface.dropTable('assignments');
    await queryInterface.dropTable('assignment_rules');
  }
};