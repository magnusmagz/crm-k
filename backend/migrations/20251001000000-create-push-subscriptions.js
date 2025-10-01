/**
 * Migration: Create push_subscriptions table
 *
 * This table stores Web Push notification subscriptions for users.
 * Each user can have multiple subscriptions (different devices/browsers).
 *
 * The subscription object from the browser contains:
 * - endpoint: Unique URL for this subscription
 * - keys.p256dh: Public key for encryption
 * - keys.auth: Authentication secret
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('push_subscriptions', {
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
      endpoint: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Push service endpoint URL'
      },
      p256dh: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Public key for message encryption'
      },
      auth: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Authentication secret for encryption'
      },
      device_type: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Device type: ios, android, desktop, etc.'
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Browser/device user agent string'
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

    // Index on user_id for efficient queries
    await queryInterface.addIndex('push_subscriptions', ['user_id'], {
      name: 'push_subscriptions_user_id_idx'
    });

    // Unique index on endpoint to prevent duplicate subscriptions
    await queryInterface.addIndex('push_subscriptions', ['endpoint'], {
      name: 'push_subscriptions_endpoint_unique',
      unique: true
    });

    console.log('✓ Created push_subscriptions table with indexes');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('push_subscriptions');
    console.log('✓ Dropped push_subscriptions table');
  }
};
