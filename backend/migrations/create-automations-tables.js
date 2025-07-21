'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create automations table
    await queryInterface.createTable('automations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      trigger: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      conditions: {
        type: Sequelize.JSONB,
        defaultValue: [],
        allowNull: false
      },
      actions: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      execution_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      last_executed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create automation_logs table
    await queryInterface.createTable('automation_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      automation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'automations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      trigger_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      trigger_data: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      conditions_met: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      conditions_evaluated: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      actions_executed: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('success', 'failed', 'skipped'),
        allowNull: false
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      executed_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('automations', ['user_id']);
    await queryInterface.addIndex('automations', ['is_active']);
    await queryInterface.addIndex('automations', ['trigger'], { using: 'gin' });
    
    await queryInterface.addIndex('automation_logs', ['automation_id']);
    await queryInterface.addIndex('automation_logs', ['user_id']);
    await queryInterface.addIndex('automation_logs', ['executed_at']);
    await queryInterface.addIndex('automation_logs', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('automation_logs');
    await queryInterface.dropTable('automations');
  }
};