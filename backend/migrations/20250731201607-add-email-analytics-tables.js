'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add tracking fields to email_sends table
    await queryInterface.addColumn('email_sends', 'tracking_id', {
      type: Sequelize.STRING(255),
      unique: true,
      allowNull: true
    });
    
    await queryInterface.addColumn('email_sends', 'open_count', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    });
    
    await queryInterface.addColumn('email_sends', 'click_count', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    });
    
    await queryInterface.addColumn('email_sends', 'clicked_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
    
    await queryInterface.addColumn('email_sends', 'last_opened_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
    
    await queryInterface.addColumn('email_sends', 'unsubscribed_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Create index for tracking_id
    await queryInterface.addIndex('email_sends', ['tracking_id'], {
      name: 'idx_email_sends_tracking_id'
    });

    // Create email_events table
    await queryInterface.createTable('email_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      email_send_id: {
        type: Sequelize.UUID,
        references: {
          model: 'email_sends',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        allowNull: false
      },
      event_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        validate: {
          isIn: [['open', 'click', 'bounce', 'spam_complaint', 'unsubscribe']]
        }
      },
      event_data: {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: false
      },
      ip_address: {
        type: Sequelize.INET,
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      occurred_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
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

    // Create indexes for email_events
    await queryInterface.addIndex('email_events', ['email_send_id'], {
      name: 'idx_email_events_email_send_id'
    });
    
    await queryInterface.addIndex('email_events', ['event_type'], {
      name: 'idx_email_events_type'
    });
    
    await queryInterface.addIndex('email_events', ['occurred_at'], {
      name: 'idx_email_events_occurred_at'
    });

    // Create email_links table
    await queryInterface.createTable('email_links', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      email_send_id: {
        type: Sequelize.UUID,
        references: {
          model: 'email_sends',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        allowNull: false
      },
      link_id: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false
      },
      original_url: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      click_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      first_clicked_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      last_clicked_at: {
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

    // Create index for email_links
    await queryInterface.addIndex('email_links', ['link_id'], {
      name: 'idx_email_links_link_id'
    });
    
    await queryInterface.addIndex('email_links', ['email_send_id'], {
      name: 'idx_email_links_email_send_id'
    });

    // Create email_suppressions table for unsubscribes and complaints
    await queryInterface.createTable('email_suppressions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        unique: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        allowNull: true
      },
      reason: {
        type: Sequelize.STRING(50),
        allowNull: false,
        validate: {
          isIn: [['unsubscribe', 'spam_complaint', 'hard_bounce', 'manual']]
        }
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

    // Create index for email_suppressions
    await queryInterface.addIndex('email_suppressions', ['email'], {
      name: 'idx_email_suppressions_email'
    });
  },

  async down (queryInterface, Sequelize) {
    // Drop tables in reverse order
    await queryInterface.dropTable('email_suppressions');
    await queryInterface.dropTable('email_links');
    await queryInterface.dropTable('email_events');
    
    // Remove columns from email_sends
    await queryInterface.removeColumn('email_sends', 'unsubscribed_at');
    await queryInterface.removeColumn('email_sends', 'last_opened_at');
    await queryInterface.removeColumn('email_sends', 'clicked_at');
    await queryInterface.removeColumn('email_sends', 'click_count');
    await queryInterface.removeColumn('email_sends', 'open_count');
    await queryInterface.removeColumn('email_sends', 'tracking_id');
  }
};