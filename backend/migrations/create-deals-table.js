'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('deals', {
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
      contact_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'contacts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      stage_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'stages',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
      },
      status: {
        type: Sequelize.ENUM('open', 'won', 'lost'),
        defaultValue: 'open',
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      closed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      expected_close_date: {
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

    await queryInterface.addIndex('deals', ['user_id']);
    await queryInterface.addIndex('deals', ['contact_id']);
    await queryInterface.addIndex('deals', ['stage_id']);
    await queryInterface.addIndex('deals', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('deals');
  }
};