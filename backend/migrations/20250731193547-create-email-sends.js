'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('email_sends', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      contact_id: {
        type: Sequelize.UUID,
        references: {
          model: 'contacts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      postmark_message_id: {
        type: Sequelize.STRING(255),
        unique: true
      },
      subject: {
        type: Sequelize.STRING(255)
      },
      message: {
        type: Sequelize.TEXT
      },
      status: {
        type: Sequelize.STRING(50),
        defaultValue: 'sent'
      },
      sent_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      opened_at: {
        type: Sequelize.DATE
      },
      bounced_at: {
        type: Sequelize.DATE
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

    // Create indexes
    await queryInterface.addIndex('email_sends', ['postmark_message_id'], {
      name: 'idx_email_sends_postmark_id'
    });
    
    await queryInterface.addIndex('email_sends', ['contact_id'], {
      name: 'idx_email_sends_contact_id'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('email_sends');
  }
};
