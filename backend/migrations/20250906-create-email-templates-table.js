'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create email_templates table
    await queryInterface.createTable('email_templates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      organizationId: {
        type: Sequelize.UUID,
        field: 'organizationId',
        allowNull: false,
        references: {
          model: 'organizations',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      subject: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      design_json: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      html_output: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      category: {
        type: Sequelize.STRING(50),
        defaultValue: 'general'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      updated_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('email_templates', ['organizationId']);
    await queryInterface.addIndex('email_templates', ['category']);
    await queryInterface.addIndex('email_templates', ['is_active']);
    
    // Create email_campaigns table for future use
    await queryInterface.createTable('email_campaigns', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      organizationId: {
        type: Sequelize.UUID,
        field: 'organizationId',
        allowNull: false,
        references: {
          model: 'organizations',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      template_id: {
        type: Sequelize.UUID,
        references: {
          model: 'email_templates',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      subject: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(50),
        defaultValue: 'draft'
      },
      recipient_filters: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      scheduled_for: {
        type: Sequelize.DATE,
        allowNull: true
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      recipient_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      sent_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      opened_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      clicked_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      bounced_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      unsubscribed_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      settings: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      created_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for campaigns
    await queryInterface.addIndex('email_campaigns', ['organizationId']);
    await queryInterface.addIndex('email_campaigns', ['template_id']);
    await queryInterface.addIndex('email_campaigns', ['status']);
    await queryInterface.addIndex('email_campaigns', ['scheduled_for']);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order due to foreign key constraints
    await queryInterface.dropTable('email_campaigns');
    await queryInterface.dropTable('email_templates');
  }
};