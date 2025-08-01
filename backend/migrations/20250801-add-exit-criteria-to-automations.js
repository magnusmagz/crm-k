'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add exit criteria columns to automations table
    await queryInterface.addColumn('automations', 'exit_criteria', {
      type: Sequelize.JSONB,
      defaultValue: {},
      allowNull: false
    });

    await queryInterface.addColumn('automations', 'max_duration_days', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.addColumn('automations', 'safety_exit_enabled', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    });

    // Add exit tracking columns to automation_enrollments table
    await queryInterface.addColumn('automation_enrollments', 'exit_reason', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('automation_enrollments', 'exited_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Create automation_exit_conditions table
    await queryInterface.createTable('automation_exit_conditions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      automation_id: {
        type: Sequelize.UUID,
        references: {
          model: 'automations',
          key: 'id'
        },
        onDelete: 'CASCADE',
        allowNull: false
      },
      condition_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        validate: {
          isIn: [['goal', 'time', 'condition', 'safety']]
        }
      },
      condition_config: {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('automation_exit_conditions', ['automation_id']);
    await queryInterface.addIndex('automation_exit_conditions', ['condition_type']);
    await queryInterface.addIndex('automation_exit_conditions', ['is_active']);
    await queryInterface.addIndex('automation_enrollments', ['exit_reason']);
    await queryInterface.addIndex('automation_enrollments', ['exited_at']);

    // Update status enum to include 'exited' status
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_automation_enrollments_status" ADD VALUE IF NOT EXISTS 'exited';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns from automations table
    await queryInterface.removeColumn('automations', 'exit_criteria');
    await queryInterface.removeColumn('automations', 'max_duration_days');
    await queryInterface.removeColumn('automations', 'safety_exit_enabled');

    // Remove columns from automation_enrollments table
    await queryInterface.removeColumn('automation_enrollments', 'exit_reason');
    await queryInterface.removeColumn('automation_enrollments', 'exited_at');

    // Drop automation_exit_conditions table
    await queryInterface.dropTable('automation_exit_conditions');

    // Note: We cannot easily remove enum values in PostgreSQL, so we leave 'exited' status
  }
};