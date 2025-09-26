'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('reminders', {
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
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      remind_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      entity_type: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      entity_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      is_completed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
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

    // Add indexes for performance
    await queryInterface.addIndex('reminders', ['user_id', 'remind_at'], {
      name: 'idx_reminders_user_remind_at',
      where: {
        is_completed: false
      }
    });

    await queryInterface.addIndex('reminders', ['entity_type', 'entity_id'], {
      name: 'idx_reminders_entity'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('reminders');
  }
};